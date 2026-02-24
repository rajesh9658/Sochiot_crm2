import jwt from 'jsonwebtoken'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export const generateAccessToken = (payload: any) => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: '15m',
  })
}

export const generateRefreshToken = (payload: any) => {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: '7d',
  })
}

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET)
}