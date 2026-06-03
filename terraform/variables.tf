variable "aws_region" {
  description = "Región de AWS donde se desplegarán los recursos"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Nombre base para los recursos del proyecto"
  type        = string
  default     = "ordinario-nt"
}

variable "db_name" {
  description = "Nombre de la base de datos PostgreSQL"
  type        = string
  default     = "ordinariodb"
}

variable "db_username" {
  description = "Usuario administrador de la base de datos RDS"
  type        = string
  default     = "dbadmin"
  sensitive   = true
}

variable "db_password" {
  description = "Contraseña para el administrador de la base de datos (debe tener al menos 8 caracteres)"
  type        = string
  sensitive   = true
}
