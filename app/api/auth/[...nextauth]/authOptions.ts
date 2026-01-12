import GoogleProvider from "next-auth/providers/google"
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { User } from "@/types/mongodb";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        const client = await clientPromise;
        const db = client.db("model-viewer");
        const usersCollection = db.collection<User>("users");

        const existingUser = await usersCollection.findOne({ email: user.email });

        if (existingUser) {
          token.id = existingUser._id.toString();
          token.role = existingUser.role || "user";
        } else {
          const now = new Date();
          const newUser: User = {
            _id: new ObjectId().toString(),
            username: user.name || user.email,
            email: user.email,
            role: "user",
            createdAt: now,
            updatedAt: now,
          };

          await usersCollection.insertOne(newUser);

          token.id = newUser._id.toString();
          token.role = newUser.role;
        }
      }

      return token;
    },

    async session({ session, token }: any) {
      if (session.user) {
        session.user._id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};
