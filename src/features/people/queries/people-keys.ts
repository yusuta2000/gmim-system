export const peopleKeys = { all: ['people'] as const, list: (department: string) => ['people', department] as const }
