# --- GRUPOS DE SEGURIDAD (SECURITY GROUPS) ---

# Grupo de Seguridad para el Backend (App Runner VPC Connector)
resource "aws_security_group" "backend" {
  name        = "${var.project_name}-backend-sg"
  description = "Permite salida de trafico para el backend en la VPC"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name = "${var.project_name}-backend-sg"
  }
}

# Grupo de Seguridad para la Base de Datos RDS (PostgreSQL)
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Permite acceso a PostgreSQL unicamente desde el Security Group del Backend"
  vpc_id      = aws_vpc.main.id

  # Permitir entrada en el puerto 5432 (Postgres) SOLO desde el security group del backend
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  # Bloquear salidas innecesarias de la base de datos
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}


# --- BASE DE DATOS (AWS RDS - POSTGRESQL) ---

# Grupo de Subredes para RDS (Asociado a subredes privadas DB)
resource "aws_db_subnet_group" "db_subnet" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.private_db_1.id, aws_subnet.private_db_2.id]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# Instancia RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier             = "${var.project_name}-db"
  allocated_storage      = 20
  max_allocated_storage  = 100
  engine                 = "postgres"
  engine_version         = "15.7"
  instance_class         = "db.t3.micro" # Capa Gratuita
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.db_subnet.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot    = true          # Permite destruccion rapida para demostraciones escolares
  publicly_accessible    = false         # Base de datos 100% privada sin acceso de internet directo

  tags = {
    Name = "${var.project_name}-postgres"
  }
}


# --- CAPA FRONTEND (S3 + CLOUDFRONT) ---

# Generar un sufijo aleatorio para que el nombre del bucket S3 sea globalmente unico
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Bucket S3 para archivos estaticos del Frontend
resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.project_name}-frontend-${random_id.bucket_suffix.hex}"
  force_destroy = true # Borra archivos al eliminar la infraestructura (util para pruebas)

  tags = {
    Name = "${var.project_name}-frontend-bucket"
  }
}

# Bloquear acceso publico directo al Bucket (Seguridad AWS recomendada)
resource "aws_s3_bucket_public_access_block" "frontend_block" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Configurar Origin Access Control (OAC) para permitir a CloudFront leer de S3
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.project_name}-oac"
  description                       = "OAC para permitir a CloudFront leer el bucket de S3 de forma segura"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Distribucion de CloudFront
resource "aws_cloudfront_distribution" "frontend_cdn" {
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
    origin_id                = "S3-${aws_s3_bucket.frontend.bucket}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  # Configurar restricciones geograficas vacias
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Certificado SSL por defecto de CloudFront (*.cloudfront.net)
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${var.project_name}-cloudfront"
  }
}

# Politica del bucket S3 para permitir el acceso exclusivo a la distribucion de CloudFront
resource "aws_s3_bucket_policy" "allow_cloudfront" {
  bucket     = aws_s3_bucket.frontend.id
  depends_on = [aws_s3_bucket_public_access_block.frontend_block]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend_cdn.arn
          }
        }
      }
    ]
  })
}


# --- CAPA BACKEND (ECR + AWS APP RUNNER) ---

# Repositorio ECR para subir la imagen Docker del Backend
resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"
  force_destroy        = true # Elimina el repositorio incluso si contiene imagenes

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.project_name}-backend-ecr"
  }
}

# Rol de IAM para que App Runner descargue imagenes de ECR
resource "aws_iam_role" "apprunner_ecr_access" {
  name = "${var.project_name}-apprunner-ecr-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
      }
    ]
  })
}

# Adjuntar politica para leer de ECR al rol anterior
resource "aws_iam_role_policy_attachment" "apprunner_ecr_policy" {
  role       = aws_iam_role.apprunner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# Conector VPC para que App Runner pueda comunicarse de forma privada con RDS
resource "aws_apprunner_vpc_connector" "vpc_connector" {
  vpc_connector_name = "${var.project_name}-vpc-connector"
  subnets            = [aws_subnet.private_backend_1.id, aws_subnet.private_backend_2.id]
  security_groups    = [aws_security_group.backend.id]

  tags = {
    Name = "${var.project_name}-apprunner-vpc-connector"
  }
}

# Servicio AWS App Runner (Backend Serverless)
resource "aws_apprunner_service" "backend" {
  service_name = "${var.project_name}-service"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }
    image_repository {
      image_identifier      = "${aws_ecr_repository.backend.repository_url}:latest"
      image_repository_type = "ECR"
      image_configuration {
        port = "5000"
        
        # Variables de entorno inyectadas al contenedor en AWS
        runtime_environment_variables = {
          PORT          = "5000"
          FRONTEND_URL  = "*" # Permitir solicitudes CORS desde cualquier origen (evita dependencias circulares)
          DB_HOST       = aws_db_instance.postgres.address
          DB_PORT       = "5432"
          DB_USER       = var.db_username
          DB_PASSWORD   = var.db_password
          DB_DATABASE   = var.db_name
        }
      }
    }
    auto_deployments_enabled = false
  }

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.vpc_connector.arn
    }
  }

  instance_configuration {
    cpu    = "1024" # 1 vCPU
    memory = "2048" # 2 GB
  }

  tags = {
    Name = "${var.project_name}-apprunner-service"
  }

  depends_on = [
    aws_iam_role_policy_attachment.apprunner_ecr_policy,
    aws_db_instance.postgres
  ]
}
