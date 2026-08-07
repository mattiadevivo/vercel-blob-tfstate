variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

variable "dockerhub_username" {
  description = "DockerHub username"
  type = string
}

variable "dockerhub_token" {
  description = "DockerHub token"
  sensitive = true
  type = string
}
