data "github_repository" "tvtrash" {
  full_name = "mattiadevivo/trevisorifiuti.top"
}

resource "github_actions_variable" "test" {
  repository    = data.github_repository.tvtrash.name
  variable_name = "TEST"
  value         = "test"
}

