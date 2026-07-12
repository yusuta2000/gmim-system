import { validateProjectDocs } from './lib/project-docs-validation'

const errors = validateProjectDocs(process.cwd())

if (errors.length > 0) {
  console.error(`Project documentation validation failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Project documentation validation passed with 0 errors')
