import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { resetSessionForTests } from '../lib/session'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  // A sessão vive fora do React: sem isto, o login de um teste vazaria para o seguinte.
  resetSessionForTests()
})
