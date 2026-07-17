data "github_repository" "example" {
  full_name = "mattiadevivo/vercel-blob-tfstate"
}

resource "github_actions_variable" "test" {
  repository    = data.github_repository.example.name
  variable_name = "TEST"
  value         = "test"
}

