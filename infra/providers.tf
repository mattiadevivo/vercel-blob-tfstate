terraform {
  backend "http" {
    address        = "http://localhost:8090/state/vercel-blob-tfstate"
    lock_address   = "http://localhost:8090/state/vercel-blob-tfstate/lock"
    unlock_address = "http://localhost:8090/state/vercel-blob-tfstate/lock"
    lock_method    = "POST"
    unlock_method  = "DELETE"
    username       = "vercel-blob-tfstate"
  }
  required_providers {
    github = {
      source  = "integrations/github"
      version = "6.13.0"
    }
  }
}

provider "github" {
  token = var.github_token
  owner = "mattiadevivo"
}
