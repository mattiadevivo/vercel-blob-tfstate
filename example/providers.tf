terraform {
  backend "http" {
    address        = "http://localhost:8090/state/trevisorifiuti"
    lock_address   = "http://localhost:8090/state/trevisorifiuti/lock"
    unlock_address = "http://localhost:8090/state/trevisorifiuti/lock"
    lock_method    = "POST"
    unlock_method  = "DELETE"
    username       = "trevisorifiuti"
  }
  required_providers {
    github = {
      source  = "integrations/github"
      version = "6.11.1"
    }
  }
}

provider "github" {
  token = var.github_token
  owner = "mattiadevivo"
}
