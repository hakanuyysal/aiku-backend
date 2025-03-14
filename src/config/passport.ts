import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';
import dotenv from 'dotenv';

// Çevre değişkenlerini yükle
dotenv.config();

// Passport serileştirme/deserileştirme ayarları
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth stratejisi
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Google ID'si ile kullanıcıyı ara
        let user = await User.findOne({
          email: profile.emails?.[0].value
        });

        // Kullanıcı yoksa yeni kayıt oluştur
        if (!user) {
          const nameParts = profile.displayName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          user = await User.create({
            firstName,
            lastName,
            email: profile.emails?.[0].value,
            profilePhoto: profile.photos?.[0].value,
            authProvider: 'google',
            emailVerified: true
          });
        } else {
          // Eğer kullanıcı var ama Google ile giriş yapmıyorsa güncelle
          if (user.authProvider !== 'google') {
            user.authProvider = 'google';
            await user.save();
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

export default passport; 