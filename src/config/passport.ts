import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';
import dotenv from 'dotenv';

// Çevre değişkenlerini yükle
dotenv.config();

// Passport serileştirme/deserileştirme ayarları
passport.serializeUser((user: any, done) => {
  console.log('[Passport] Kullanıcı serileştiriliyor:', { userId: user.id });
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  console.log('[Passport] Kullanıcı deserileştirme işlemi başladı:', { userId: id });
  try {
    const user = await User.findById(id);
    console.log('[Passport] Kullanıcı deserileştirildi:', { userId: id, userFound: !!user });
    done(null, user);
  } catch (error) {
    console.error('[Passport] Deserileştirme hatası:', error);
    done(error, null);
  }
});

// Google OAuth stratejisi
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.API_URL}/api/auth/google/callback`,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log('[GoogleStrategy] Google stratejisi çağırıldı:', { 
        profileId: profile.id,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value
      });

      try {
        // Google ID'si ile kullanıcıyı ara
        console.log('[GoogleStrategy] Kullanıcı aranıyor:', { email: profile.emails?.[0]?.value });
        let user = await User.findOne({
          email: profile.emails?.[0].value
        });

        // Kullanıcı yoksa yeni kayıt oluştur
        if (!user) {
          console.log('[GoogleStrategy] Kullanıcı bulunamadı, yeni kullanıcı oluşturuluyor');
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
          console.log('[GoogleStrategy] Yeni kullanıcı oluşturuldu:', { userId: user._id });
        } else {
          console.log('[GoogleStrategy] Mevcut kullanıcı bulundu:', { userId: user._id });
          // Eğer kullanıcı var ama Google ile giriş yapmıyorsa güncelle
          if (user.authProvider !== 'google') {
            user.authProvider = 'google';
            await user.save();
            console.log('[GoogleStrategy] Kullanıcı auth provider Google olarak güncellendi');
          }
        }

        console.log('[GoogleStrategy] Google stratejisi tamamlandı, kullanıcı döndürülüyor:', { userId: user._id });
        return done(null, user);
      } catch (error) {
        console.error('[GoogleStrategy] Google stratejisi hatası:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

export default passport; 