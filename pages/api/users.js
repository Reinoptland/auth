import { z } from "zod";

const User = z.object({
  email: z.string().email(),
  password: z.string().length(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string(),
});

export default function handler(req, res) {
  try {
    const user = User.parse(req.body);
    res.status(200).json({ name: "John Doe" });
  } catch (error) {
    res.status(400).json({ errors: error.issues });
  }
}
