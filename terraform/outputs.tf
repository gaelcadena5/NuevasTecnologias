output "frontend_url" {
  description = "URL publica del Frontend served por CloudFront CDN"
  value       = "https://${aws_cloudfront_distribution.frontend_cdn.domain_name}"
}

output "backend_url" {
  description = "URL publica del Backend en AWS App Runner"
  value       = "https://${aws_apprunner_service.backend.service_url}"
}

output "database_endpoint" {
  description = "Endpoint de conexion para la base de datos PostgreSQL en RDS (Privada)"
  value       = aws_db_instance.postgres.endpoint
}

output "ecr_repository_url" {
  description = "URL del repositorio ECR para compilar y subir la imagen Docker del Backend"
  value       = aws_ecr_repository.backend.repository_url
}
