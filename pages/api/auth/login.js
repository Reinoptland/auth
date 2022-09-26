import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

const LoginRequestBody = z.object({
  email: z.string(),
  password: z.string(),
});

function comparePassWord(passwordHash, plaintextPassword) {
  return bcrypt.compareSync(plaintextPassword, passwordHash);
}

function AuthError(message = "Email or password incorrect") {
  return { message: message };
}

async function login(req, res) {
  try {
    const validatedCredentials = LoginRequestBody.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: validatedCredentials.email },
    });

    const isPasswordValid = comparePassWord(
      user.password,
      validatedCredentials.password
    );

    if (!isPasswordValid) throw new AuthError("Email or password incorrect");

    const token = signJWT(user);
    return res.status(200).json({ message: "Login success", token: token });
  } catch (error) {
    if (isRequestValidationError(error)) {
      return handleValidationError(res, error);
    } else if (isNotFoundError(error) || isAuthError(error)) {
      return handleAuthError(res);
    } else {
      return handleUnknownError(res, error);
    }
  }
}

function signJWT(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET);
}

function handleAuthError(res) {
  return res.status(403).json({ message: "Email or password incorrect" });
}

export default async function handler(req, res) {
  switch (req.method) {
    case "POST":
      return login(req, res);

    default:
      return res.status(404).json({ message: "This route does not exist" });
  }
}

function isAuthError(error) {
  return error.message === "Email or password incorrect";
}

function isRequestValidationError(error) {
  return error.hasOwnProperty("issues");
}

function isNotFoundError(error) {
  return error.name === "NotFoundError";
}

function handleUnknownError(res, error) {
  console.log(error);
  return res.status(500).json({ message: "Oh no, something unexpected!" });
}

function handleValidationError(res, error) {
  return res.status(400).json({
    message: "Some fields in the form were not filled in correctly",
    errors: error.issues,
  });
}
