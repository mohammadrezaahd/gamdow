# راه‌اندازی gamdow

## شاخه و انتشار

بک‌اند و integration اولیهٔ Steam اکنون در `main` مرج شده‌اند. تغییرات Import انتخابی و Sync تکمیلی در شاخهٔ `steam-import` هستند.

اگر پروژهٔ فعلی Vercel از `main` دیپلوی می‌شود، برای بررسی این تغییرات از Preview شاخهٔ `steam-import` استفاده کن یا یک پروژهٔ جدا به همین ریپو متصل کن. پس از بررسی می‌توانی PR را مرج کنی؛ صرف پوش این شاخه جای Production روی main را عوض نمی‌کند.

در Vercel: Framework = Next.js، Node.js = 22.x یا 24.x، Build Command = `npm run build`، Install = `npm ci`، Output Directory پیش‌فرض. APIها Node.js هستند؛ نیازی به سرور Express، اجرای دائمی Node یا Docker روی Vercel نیست.

## MongoDB Atlas

۱. در Atlas یک کلاستر بساز و در Database Access یک database user با دسترسی خواندن/نوشتن دیتابیس برنامه ایجاد کن. این کاربر با حساب ورود سایت Atlas متفاوت است.
۲. در Connect → Drivers رشتهٔ اتصال Node.js را بردار. نام کاربر، رمز و آدرس کلاستر را جایگزین کن. کاراکترهای خاص رمز باید URL-encode شوند.
۳. دسترسی شبکهٔ کلاستر را برای خروجی پروژهٔ Vercel تنظیم کن. قواعد IP باید با روش خروجی شبکهٔ پلن شما سازگار باشند؛ بازکردن دسترسی همهٔ IPها را تنظیم پیش‌فرض پروژه نکرده‌ایم.
۴. `MONGODB_URI` و `MONGODB_DB=gamdow` را در Vercel ثبت کن. دیتابیس و ایندکس‌ها با اولین درخواست ساخته می‌شوند؛ migration دستی یا replica set برای اجرای محلی لازم نیست.
۵. همان URI را در MongoDB Compass وارد کن. بعد از اولین ثبت‌نام، collectionهای `accounts`، `sessions`، `media` و `rate_limits` را می‌بینی. اطلاعات پروفایل و کتابخانه زیر `accounts.snapshot` است. رمزها هش‌شده‌اند.

## عکس‌ها روی Vercel

در Storage پروژه یک Blob store با دسترسی **Private** بساز و آن را به پروژه وصل کن. مقدار `BLOB_READ_WRITE_TOKEN` آن store را برای محیط موردنظر تنظیم کن و `MEDIA_STORAGE=vercel-blob` بگذار. SDK جدید OIDC و `BLOB_STORE_ID` را هم پشتیبانی می‌کند؛ نمونه‌های این پروژه از توکن استفاده می‌کنند تا اجرای محلی علیه همان store هم ممکن باشد.

عکس در مرورگر crop می‌شود، سپس حداکثر ۳ MiB به API ارسال می‌شود؛ کمتر از سقف ۴٫۵ MB درخواست‌های Vercel. سرور فرمت/تعداد پیکسل‌ها را بررسی می‌کند، متادیتا را با تبدیل مجدد JPEG حذف می‌کند و فایل را خصوصی ذخیره می‌کند. مرورگر فقط `/api/media/<id>` می‌بیند؛ این مسیر هر بار نشست و مالک فایل را بررسی می‌کند.

فایل اصلی پیش از crop می‌تواند تا ۲۰ MiB باشد؛ این فایل مستقیماً به سرور ارسال نمی‌شود. خروجی بزرگ‌تر از ۳ MiB با پیام خطا رد می‌شود. نسبت‌های کراپ همان فرانت باقی مانده‌اند.

## فایل‌های محیطی

| متغیر | محلی | Vercel |
|---|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` | URI واقعی Atlas |
| `MONGODB_DB` | `gamdow_local` | `gamdow` |
| `APP_URL` | `http://localhost:3000` | origin دقیق دامنه، بدون مسیر |
| `MEDIA_STORAGE` | `local` | `vercel-blob` |
| `LOCAL_MEDIA_DIR` | `.data/uploads` | استفاده نمی‌شود |
| `BLOB_READ_WRITE_TOKEN` | فقط اگر Blob انتخاب شود | توکن store خصوصی |

هیچ‌کدام `NEXT_PUBLIC_` نیستند. secret جدا برای JWT لازم نیست: نشست‌ها توکن تصادفی ۲۵۶بیتی دارند و فقط هش توکن در MongoDB ذخیره می‌شود.

`.env.local.example` و `.env.prod.example` داخل Git هستند. آن‌ها را به `.env.local` و `.env.prod` کپی کن و مقادیر را وارد کن. فایل‌های واقعی توسط Git نادیده گرفته می‌شوند. Next.js نام `.env.prod` را خودکار نمی‌خواند؛ اسکریپت‌های `build:prod` و `start:prod` آن را صریح بارگذاری می‌کنند. Vercel تنظیمات داشبورد خودش را می‌خواند.

برای Preview، `APP_URL` پروداکشن را استفاده نکن: یا origin دقیق Preview را تنظیم کن یا متغیر را در محیط Preview نگذار تا origin درخواست مبنا باشد. ترجیحاً دیتابیس و Blob جدا برای Preview داشته باش. بعد از تغییر env، redeploy لازم است.

## اجرای محلی و Compass

اگر MongoDB Community Server نصب و سرویس آن فعال است، `.env.local.example` آمادهٔ استفاده است. Compass به‌تنهایی دیتابیس را اجرا نمی‌کند. راه جایگزین با Docker: `docker compose up -d`. پورت کانتینر فقط روی loopback سیستم منتشر می‌شود و داده‌ها در volume پایدار می‌مانند.

دستورها در PowerShell، CMD و Linux یکسان‌اند: `npm ci` سپس `npm run dev`. آدرس مرورگر باید با `APP_URL` یکی باشد؛ اگر پورت را تغییر می‌دهی، env را هم تغییر بده.

## بکاپ و محدودیت‌های نسخهٔ فعلی

خروجی Settings فقط متادیتای آرشیو و شناسهٔ تصاویر است، نه خود فایل‌ها، رمز یا نشست. برای بکاپ کامل باید MongoDB و فایل‌های Blob/پوشهٔ محلی را جدا پشتیبان بگیری. بازیابی JSON در همان حساب/store انجام می‌شود؛ تصاویر کاربر دیگر، URL خارجی یا عکس base64 نسخهٔ نمونه پذیرفته نمی‌شوند. انتقال نسخهٔ قدیمی نیاز به بارگذاری مجدد عکس‌ها دارد.

ذخیره‌سازی آرشیو فعلاً یک سند برای هر حساب است، با سقف ۳ MiB برای JSON هر درخواست؛ تعداد تگ‌ها سقف مستقل ندارد، طول هر تگ حداکثر ۵۰۰ کاراکتر است. تصاویر خارج از این سندند. قبل از بزرگ‌شدن فراتر از این اندازه، API باید به collectionهای مستقل و pagination توسعه پیدا کند.

فایل بارگذاری‌شده پس از حذف از گالری/کاور فوراً از storage پاک نمی‌شود تا ارجاع‌های بکاپ همان حساب معتبر بمانند. فایل‌های استفاده‌نشده نیز فعلاً نگه داشته می‌شوند؛ هزینه و پاک‌سازی storage را در مدیریت store لحاظ کن. این رفتار حذف بازی را از لیست و آمار متوقف نمی‌کند.

این نسخه ورود ایمیل/رمز دارد؛ سرویس ارسال ایمیل، تأیید ایمیل و بازیابی رمز هنوز متصل نشده‌اند. رابط، لینک نمایشی برای این عملیات ارائه نمی‌کند.

## منابع رسمی مطالعه‌شده

- https://nextjs.org/docs/app/guides/authentication
- https://nextjs.org/docs/app/guides/environment-variables
- https://nextjs.org/docs/app/api-reference/functions/cookies
- https://vercel.com/docs/vercel-blob/private-storage
- https://vercel.com/docs/vercel-blob/server-upload
- https://vercel.com/docs/git
- https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/
- https://www.mongodb.com/docs/compass/connect/
- https://nodejs.org/api/crypto.html

برای بررسی اتصال بدون اجرای وب‌سایت، `npm run db:check` تنظیمات `.env.local` و `npm run db:check:prod` تنظیمات `.env.prod` را بررسی می‌کنند. این دستور URI یا رمز را چاپ نمی‌کند و دیتایی تغییر نمی‌دهد.
