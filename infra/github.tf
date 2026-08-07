data "github_repository" "vercel_blob_tfstate" {
  full_name = "mattiadevivo/vercel-blob-tfstate"
}

resource "github_actions_variable" "dockerhub_username" {
  repository    = data.github_repository.vercel_blob_tfstate.name
  variable_name = "DOCKERHUB_USERNAME"
  value         = var.dockerhub_username
}

resource "github_actions_secret" "dockerhub_password" {
  repository = data.github_repository.vercel_blob_tfstate.name
  secret_name = "DOCKERHUB_TOKEN"
  value = var.dockerhub_token
}

