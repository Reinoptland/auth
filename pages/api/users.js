import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const User = z.object({
  email: z.string().email(),
  password: z.string().length(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string(),
});

function isRequestValidationError(error) {
  return error.hasOwnProperty("issues");
}

function isDatabaseError(error) {
  return error.hasOwnProperty("code");
}

function hashPassword(myPlaintextPassword) {
  console.log("SALT", process.env.SALT_ROUNDS);
  return bcrypt.hashSync(myPlaintextPassword, Number(process.env.SALT_ROUNDS));
}

export default async function handler(req, res) {
  try {
    const validatedUser = User.parse(req.body);
    const savedUser = await prisma.user.create({
      data: {
        ...validatedUser,
        password: hashPassword(validatedUser.password),
      },
    });
    res.status(200).json(savedUser);
  } catch (error) {
    if (isRequestValidationError(error)) {
      return res.status(400).json({
        message: "Some fields in the form were not filled in correctly",
        errors: error.issues,
      });
    } else if (isDatabaseError(error)) {
      switch (error.code) {
        case "P2002":
          return res
            .status(400)
            .json({ message: "A user with this email already exists" });

        default:
          return res.status(400).json({
            message: "Something unexpted happened please contact support",
          });
      }
    } else {
      return res.status(500).json({ message: "Oh no, something unexpected!" });
    }
  }
}
