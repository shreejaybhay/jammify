import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          await connectDB();
          
          const user = await User.findOne({ email: credentials.email });
          
          if (!user) {
            return null;
          }

          if (!user.isVerified) {
            return null;
          }

          const isPasswordValid = await user.comparePassword(credentials.password);
          
          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === 'google' || account?.provider === 'github') {
          await connectDB();
          
          let existingUser = await User.findOne({ email: user.email });
          
          if (existingUser) {
            // Update OAuth ID if not set
            if (account.provider === 'google' && !existingUser.googleId) {
              existingUser.googleId = account.providerAccountId;
              existingUser.isVerified = true;
              await existingUser.save();
            }
            if (account.provider === 'github' && !existingUser.githubId) {
              existingUser.githubId = account.providerAccountId;
              existingUser.isVerified = true;
              await existingUser.save();
            }
          } else {
            // Create new user for OAuth
            const newUser = new User({
              name: user.name || user.email.split('@')[0],
              email: user.email,
              image: user.image,
              isVerified: true,
              emailVerified: new Date(),
              ...(account.provider === 'google' && { googleId: account.providerAccountId }),
              ...(account.provider === 'github' && { githubId: account.providerAccountId }),
            });
            await newUser.save();
          }
        }
        return true;
      } catch (error) {
        console.error('SignIn callback error:', error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };