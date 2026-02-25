import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { generateAccessToken, generateRefreshToken } from '../../lib/jwt'

export class AuthService {
  static async registerCompany(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10)

    return prisma.$transaction(async (tx) => {

      // 1️⃣ Create User
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
        },
      })

      // 2️⃣ Create Company
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          planId: 1, // Default plan (starter)
        },
      })

      // 3️⃣ Attach CompanyUser
      const membership = await tx.companyUser.create({
        data: {
          companyId: company.id,
          userId: user.id,
          employeeCode: "ADMIN-001",
          systemRole: 'COMPANY_ADMIN',
        },
      })

      const payload = {
        userId: user.id,
        companyId: company.id,
        role: membership.systemRole,
      }

      const accessToken = generateAccessToken(payload)
      const refreshToken = generateRefreshToken(payload)

      return {
        user,
        company,
        accessToken,
        refreshToken,
      }
    })
  }
}
