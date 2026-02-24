import type { Request, Response } from 'express'
import { AuthService } from './auth.service'

export class AuthController {
  static async register(req: Request, res: Response) {
    const result = await AuthService.registerCompany(req.body)

    res.status(201).json({
      message: "Company registered successfully",
      data: result,
    })
  }
}