import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      branchId: string | null
      branchName: string | null
    }
  }
}
