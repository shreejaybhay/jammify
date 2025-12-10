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

          // Update lastActive on successful login
          user.lastActive = new Date();
          await user.save();

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
          
          console.log('OAuth SignIn - Provider:', account.provider, 'Email:', user.email);
          
          let existingUser = await User.findOne({ email: user.email });
          
          if (existingUser) {
            console.log('Found existing user:', existingUser._id.toString());
            // Update OAuth ID if not set
            if (account.provider === 'google' && !existingUser.googleId) {
              existingUser.googleId = account.providerAccountId;
              existingUser.isVerified = true;
            }
            if (account.provider === 'github' && !existingUser.githubId) {
              existingUser.githubId = account.providerAccountId;
              existingUser.isVerified = true;
            }
            // Update lastActive on every sign-in
            existingUser.lastActive = new Date();
            await existingUser.save();
            // Set the user ID for OAuth users
            user.id = existingUser._id.toString();
            console.log('Set user.id to:', user.id);
          } else {
            console.log('Creating new user for OAuth');
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
            const savedUser = await newUser.save();
            // Set the user ID for OAuth users
            user.id = savedUser._id.toString();
            console.log('Created new user with ID:', user.id);
          }
        }
        return true;
      } catch (error) {
        console.error('SignIn callback error:', error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      console.log('JWT callback - user:', user?.id, 'token.id:', token.id, 'account:', account?.provider);
      
      // If user object is present (first time login), use the ID from signIn callback
      if (user) {
        console.log('Setting token.id from user.id:', user.id);
        token.id = user.id;
      }
      
      // Check if token.id is a valid MongoDB ObjectId, if not, fetch from database
      const mongoose = require('mongoose');
      const isValidObjectId = token.id && mongoose.Types.ObjectId.isValid(token.id);
      
      if (!token.id || !isValidObjectId) {
        console.log('Invalid or missing ObjectId, fetching from database. Current token.id:', token.id);
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: token.email });
          if (dbUser) {
            console.log('Found DB user, setting token.id to:', dbUser._id.toString());
            token.id = dbUser._id.toString();
          } else {
            console.log('No DB user found for email:', token.email);
          }
        } catch (error) {
          console.error('JWT callback error:', error);
        }
      }
      
      console.log('Final token.id:', token.id);
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

export { handler as GET, handler as POST, authOptions };