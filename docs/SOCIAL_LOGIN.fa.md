# ورود اجتماعی و تازه‌سازی Steam

## متغیرهای جدید Vercel

```dotenv
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
```

این دو مقدار Server Side هستند و نباید `NEXT_PUBLIC_` داشته باشند. `APP_URL` باید همان origin واقعی deployment باشد؛ بدون مسیر اضافی. `STEAM_API_KEY`، `CRON_SECRET`، MongoDB و Blob همان تنظیمات قبلی‌اند. Secret واقعی وارد Git نمی‌شود.

در Google Cloud / Google Auth Platform:

1. یک پروژه انتخاب کن، Branding و Audience را تنظیم کن. اگر اپ در حالت Testing است، حساب‌های تست را به Test users اضافه کن.
2. از Clients یک OAuth client از نوع **Web application** بساز.
3. در **Authorized redirect URIs** آدرس دقیق زیر را ثبت کن (دامنهٔ واقعی خودت را جایگزین کن):

```text
https://YOUR_PROJECT.vercel.app/api/auth/google/callback
```

برای لوکال نیز `http://localhost:3000/api/auth/google/callback` را اضافه کن و `APP_URL=http://localhost:3000` بگذار. برای Preview آدرس دقیق همان Preview باید هم در Google و هم در APP_URL تنظیم شده باشد. Wildcard را به‌جای callback نگذار.

4. Client ID و Client Secret را در Environment Variables ورسل و فایل محلی مورد استفاده وارد کن و redeploy انجام بده. نیازی به API key جدید Google یا AUTH_SECRET نیست؛ state یکبارمصرف، nonce و PKCE در سرور و cookie امن مدیریت می‌شوند.

## رفتار حساب‌ها

- Google با authorization code + PKCE وارد می‌شود؛ امضا، issuer، audience، nonce، exp و sub در سرور بررسی می‌شوند. توکن Google در مرورگر یا دیتابیس نگهداری نمی‌شود.
- حساب Google جدید آرشیو خالی می‌سازد. اگر همان ایمیل قبلاً حساب رمزدار داشته باشد، اتصال خودکار بر اساس ایمیل انجام نمی‌شود: ابتدا با رمز وارد شو، سپس Profile → Sign-in methods → Connect Google sign-in را بزن. کالکشن و رمز فعلی حفظ می‌شوند.
- Steam از OpenID تأییدشده استفاده می‌کند. حساب Steam که قبلاً در Profile متصل بوده به همان حساب gamdow وارد می‌شود، نه یک کالکشن جدید. اولین ورود Steam برای حسابی که سابقهٔ اتصال ندارد حساب جدید می‌سازد.
- اتصال Steam در پروفایل، روش ورود Steam همین حساب را نیز فعال می‌کند. اتصال حساب Steam دیگری پس از Disconnect، روش ورود Steam را به حساب جدید تغییر می‌دهد.
- Disconnect داده‌های sync و اتصال Library را حذف می‌کند؛ شناسهٔ ورود Steam برای جلوگیری از قفل‌شدن حساب باقی می‌ماند. ورود دوباره با Steam اتصال را دوباره برقرار می‌کند. این موضوع در دیالوگ قطع اتصال نیز نوشته شده است.
- Steam ایمیل نمی‌دهد. برای حفظ index یکتای ایمیلِ مدل قبلی، مقدار داخلی غیرایمیلی `steam:<SteamID64>` استفاده می‌شود؛ این مقدار آدرس تماس نیست، در UI نشان داده نمی‌شود و نمی‌توان با فرم ایمیل/رمز از آن استفاده کرد.
- `googleSubject` و `steamSubject` index یکتای sparse دارند؛ `auth_flows` دارای TTL ده‌دقیقه‌ای است. داده‌های آرشیو و شناسه‌های قبلی reset نمی‌شوند.

## تازه‌سازی آمار

وقتی سایت باز می‌شود، کاربر به تب برمی‌گردد و هر پنج دقیقهٔ حضور در تب، `/api/steam/activity` آمار Playtime بازی‌های واردشده را تازه می‌کند. کش پنج‌دقیقه‌ای سمت سرور بین تب‌ها و instanceهای Vercel مشترک است. به‌روزشدن در خود Steam ممکن است تأخیر داشته باشد؛ این قابلیت push زنده از Steam نیست.

این مسیر هیچ بازی جدیدی وارد نمی‌کند و هیچ write به snapshot شخصی ندارد. bulk writeهای Mongo حداکثر ۵۰۰ موردی‌اند و فقط Playtime را در `steam_user_games` تغییر می‌دهند. UI بازشدهٔ بازی با رویداد پایان تازه‌سازی دوباره بارگذاری می‌شود؛ Achievementها همچنان TTL/فاصلهٔ پنج‌دقیقه‌ای refresh را رعایت می‌کنند. «Sync imported games» در پروفایل برای تازه‌سازی مرحله‌ای Achievementهای کل آرشیو باقی مانده است.

Profile → Steam player stats نام و آواتار Steam، لینک پروفایل، Level/XP/تعداد Badge در صورت ارائهٔ API، مجموع Playtime معلوم و Achievementهای کش‌شدهٔ بازی‌های واردشده را نشان می‌دهد. پوشش آمار معلوم صریح است؛ درصد داستان یا completion جعلی برای پروفایل ساخته نمی‌شود. فهرست بازی‌ها صفحه‌ای است و اعداد Achievement با aggregation سمت Mongo از تعریف عمومی و unlockهای همین کاربر محاسبه می‌شوند.

## تصاویر و موبایل

کارت‌های Steam از artwork کتابخانه استفاده می‌کنند: نسخهٔ 2x، سپس 600×900 و در نبود هر دو Header رسمی. بنر از Library Hero استفاده می‌کند. fallback فقط پس از خطای بارگذاری فعال می‌شود؛ URLهای موجود در کش قدیمی نیز هنگام خواندن ارتقا می‌یابند. عکس رسمی به Blob کپی نمی‌شود و روی فایل کاربر هیچ تبدیلی اعمال نشده است.

در موبایل حداقل عرض جستجوی هدر، حداقل اندازهٔ ستون‌های Grid، دیالوگ‌ها، متریک‌ها و متن‌های بلند اصلاح شده‌اند. بررسی بصری مرورگر در این محیط انجام نشده؛ قبل از تأیید نهایی نمایش، صفحات Library، جزئیات، Profile، آمار و فرم‌ها را با عرض ۳۲۰ تا ۴۳۰ پیکسل بررسی کن.

## منابع

- Google OpenID Connect: https://developers.google.com/identity/openid-connect/openid-connect
- Google Web client: https://developers.google.com/identity/protocols/oauth2/web-server
- jose JWT verification: https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md
- Steam OpenID: https://steamcommunity.com/dev
- Player summaries: https://partner.steamgames.com/doc/webapi/ISteamUser
- Steam badges: https://partner.steamgames.com/doc/webapi/IPlayerService
- Library artwork: https://partner.steamgames.com/doc/store/assets/libraryassets
