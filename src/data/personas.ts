import type { PersonaId } from '../types'

export interface PersonaDef {
  id: PersonaId
  name: string
  email: string
  label: string
  description: string
}

export const PERSONAS: PersonaDef[] = [
  {
    id: 'anonymous',
    name: 'Anonymous visitor',
    email: '',
    label: 'Anonymous',
    description: 'No login — SP intent drives the hero',
  },
  {
    id: 'anna',
    name: 'Anna Jones',
    email: 'anna.jones@example.fr',
    label: 'Anna Jones',
    description: 'Electricity only • Tariff review due • Low churn risk',
  },
  {
    id: 'marc',
    name: 'Marc Dubois',
    email: 'marc.dubois@example.fr',
    label: 'Marc Dubois',
    description: 'Solar customer • High churn risk',
  },
]
