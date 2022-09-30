import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function NoCredentialsHeaderError() {
  return new Error("This endpoint requires an authorization header");
}

function BadCredentialsError() {
  return new Error("Your authorization header is malformed");
}

function isBadCredentialsError(error) {
  return error.message === "Your authorization header is malformed";
}

function isNoCredentialsError(error) {
  return error.message === "This endpoint requires an authorization header";
}

function isTokenExpiredError(error) {
  return error.name === "TokenExpiredError";
}

function handleTokenExpiredError(req, res) {
  return res
    .status(401)
    .json({ message: "Your token has been expired, please log in again" });
}

function handleNoCredentialsError(req, res) {
  return res
    .status(401)
    .json({ message: "This endpoint requires an authorization header" });
}

function handleBadCredentialsError(req, res) {
  return res
    .status(401)
    .json({ message: "Your authorization header is malformed" });
}

async function createPost(req, res) {
  try {
    console.log(req.headers.authorization);
    // 1. Did they send _any_ credentials
    if (!req.headers.authorization) throw NoCredentialsHeaderError();
    // 1a. Is it a Bearer token?
    const [bearer, token] = req.headers.authorization.split(" ");
    if (bearer !== "Bearer" || !token) throw BadCredentialsError();

    // 2. Check: is this token valid?
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);
    // @todo - Did we sign this token? (depends on the secret)
    // - Is it not expired?

    // 3. Find the user that this token belongs to
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: decoded.id },
    });

    if (!user)
      // @todo this user no longer exists!

      console.log(user);
    //   @todo: zod, validate!
    // 4. We can create a post with this user's id as the AuthorId
    const post = await prisma.post.create({
      data: { ...req.body, authorId: user.id },
    });

    // 5. send a response, everything went well!
    res.status(201).json({ message: "post created", post: post });
  } catch (error) {
    console.log(error);
    switch (true) {
      case isNoCredentialsError(error):
        return handleNoCredentialsError(req, res);

      case isBadCredentialsError(error):
        return handleBadCredentialsError(req, res);

      case isTokenExpiredError(error):
        return handleTokenExpiredError(req, res);

      default:
        break;
    }
  }
}

export default async function handler(req, res) {
  switch (req.method) {
    case "POST":
      return createPost(req, res);

    default:
      return res.status(406).json({ message: "This method is not supported" });
  }
}
