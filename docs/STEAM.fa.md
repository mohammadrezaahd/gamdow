# اتصال Steam در gamdow

Steam منبع متادیتای عمومی است؛ MongoDB کش و دیتابیس برنامه است. اطلاعات شخصی و تصاویر آپلودی همچنان متعلق به کاربرند. هیچ درخواست metadata از مرورگر به Steam ارسال نمی‌شود؛ مرورگر فقط تصاویر رسمی CDN و صفحهٔ ورود خود Steam را باز می‌کند.

## راه‌اندازی

1. از https://steamcommunity.com/dev/apikey یک Web API Key بگیرید. این کلید عمومی/Client نیست.
2. تنظیمات زیر را به Environment Variables پروژهٔ Vercel و فایل محلی مورد استفاده اضافه کنید. فایل‌های واقعی env در git نادیده گرفته می‌شوند؛ نمونه‌ها در `.env.local.example` و `.env.prod.example` هستند.

```dotenv
STEAM_API_KEY=YOUR_STEAM_WEB_API_KEY
CRON_SECRET=YOUR_LONG_RANDOM_SECRET
STEAM_METADATA_TTL_HOURS=168
STEAM_ACHIEVEMENT_TTL_HOURS=1
# آدرس دقیق همین deployment؛ برای Preview آدرس Preview را تنظیم کنید.
APP_URL=https://YOUR_PROJECT.vercel.app
```

MongoDB و Blob همان تنظیمات قبلی را دارند. برای توسعهٔ محلی `APP_URL=http://localhost:3000` و MongoDB محلی قابل استفاده با Compass هستند. برای ساخت secret می‌توانید `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` اجرا کنید. API Key نباید پیشوند `NEXT_PUBLIC_` بگیرد.

3. بعد از deploy، برای import اولیهٔ کاتالوگ از سیستم خودتان اجرا کنید:

```sh
npm run steam:catalog:prod
```

این دستور `.env.prod` را می‌خواند و با `CRON_SECRET` به `APP_URL` درخواست می‌فرستد؛ `next start` یا deployment باید در دسترس باشد. برای سرور محلی `npm run steam:catalog` را اجرا کنید. برای Preview دارای Deployment Protection باید دسترسی آن deployment را طبق تنظیمات Vercel فراهم کنید؛ اسکریپت ورود یا redirect را دنبال نمی‌کند. بعد از توقف می‌توانید همان دستور را دوباره اجرا کنید؛ cursor در MongoDB نگهداری می‌شود.

4. Cron روزانهٔ `vercel.json` کاتالوگ را به‌صورت incremental به‌روز می‌کند. زمان‌بندی روزانه با محدودیت Hobby سازگار است. هر اجرا یک صفحهٔ حداکثر ۵۰۰۰تایی می‌خواند. اگر یک pass بیش از یک صفحه باشد، اجرای بعدی ادامه می‌دهد؛ برای تکمیل فوری همان دستور bootstrap را اجرا کنید. Cron Vercel روی Production فعال می‌شود و `CRON_SECRET` را در هدر Authorization می‌فرستد.
5. از Profile → Steam → Sign in through Steam حساب را متصل کنید؛ سپس Sync Steam library را بزنید. گذرواژه فقط در سایت خود Steam وارد می‌شود. اتصال Steam به‌معنای دسترسی به Game Details خصوصی نیست.

## مدل و سازگاری داده

| محل ذخیره                         | مسئولیت                                                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `steam_catalog`                   | سند یکتا با `_id = steamAppId`، نام و توکن‌های جستجو، نوع و زمان تغییر، متادیتای عمومی normalize‌شده و زمان sync |
| `accounts.snapshot.games` نسخهٔ ۲ | `UserGame`: شناسهٔ پایدار، source، ارجاع Steam، `personal` و `manualMetadata` خصوصی                              |
| `steam_user_games`                | Playtime و unlockهای کاربر؛ کلید یکتا برای کاربر/نسل اتصال/App ID                                                |
| `steam_achievement_schemas`       | تعریف عمومی Achievementها و تصاویرشان؛ بدون وضعیت unlock کاربر                                                   |
| `steam_connections`               | Steam ID تأییدشده، نسل اتصال، تاریخ اتصال و آخرین sync                                                           |
| `steam_sync_jobs`                 | job قابل‌ادامه، صف باقیمانده و شمارنده‌های نتیجه                                                                 |
| `steam_state`                     | cursor کاتالوگ، leaseها، state/nonce ورود و کش کوتاه جستجو                                                       |
| `media` + Blob / local storage    | فقط تصاویر آپلودشدهٔ خود کاربر                                                                                   |

`types/game.ts` همچنان DTO سازگار با UI فعلی است. `types/user-game.ts` مدل ذخیره‌سازی تفکیک‌شده و `types/steam.ts` قراردادهای integration را تعریف می‌کنند. عمومی‌بودن Steam metadata به‌معنای عمومی‌شدن آرشیو کاربران نیست؛ APIهای برنامه احراز هویت و مالکیت را بررسی می‌کنند.

آرشیو نسخهٔ ۱ بدون migration قابل خواندن است. اولین ذخیرهٔ موفق، آن را به نسخهٔ ۲ تبدیل می‌کند و یک `legacySnapshot` از دادهٔ قبل از تبدیل نگه می‌دارد. تبدیل و افزایش revision در یک write با compare-and-swap انجام می‌شود. شناسه‌ها، ارتباط کالکشن و گالری، ترتیب بازی‌ها، نقد، نمره، تگ، سری، تاریخ‌ها، یادداشت‌ها و تنظیمات حفظ می‌شوند. روی دادهٔ زنده در زمان build هیچ migration اجرا نمی‌شود.

قبل از استقرار روی دیتابیس فعلی backup بگیرید. `legacySnapshot` نسخهٔ بازیابیِ زمان تبدیل است، نه backup دائمی ویرایش‌های بعدی. بعد از ثبت دادهٔ نسخهٔ ۲، اجرای کد قدیمی بدون برنامهٔ بازیابی schema مناسب نیست؛ برای rollback کامل از backup زمان استقرار و export آخرین تغییرات استفاده کنید. export داخل Settings همچنان DTO نسخهٔ ۱ است و برای بازی لینک‌شده، `originalManualMetadata` را هم نگه می‌دارد.

در لینک‌کردن دستی، شناسهٔ Game عوض نمی‌شود و metadata قبلی برای Unlink حفظ می‌شود. اگر App ID قبلاً داخل آرشیو باشد، لینک دوم رد می‌شود؛ merge بر اساس نام انجام نمی‌دهیم. بازی Steam جدید در حالت `Not started` و بدون نمره یا progress ساخته می‌شود. Unlink یک بازی که از ابتدا Steam بوده، تصاویر رسمی را حذف می‌کند تا امکان آپلود تصویر شخصی فراهم باشد؛ عنوان و توضیح برای ادامهٔ ویرایش دستی باقی می‌مانند.

## کاتالوگ، کش و محدودیت‌ها

- فقط `IStoreService/GetAppList/v1` استفاده می‌شود؛ `include_games=true` و DLC/software/videos/hardware صریحاً false هستند.
- `last_appid` برای pagination و `if_modified_since` برای incremental sync استفاده می‌شوند. watermark تنها در پایان pass کامل جلو می‌رود؛ ۵ دقیقه overlap برای مرز زمانی داریم.
- import کاتالوگ صرفاً فهرست نام/شناسه/زمان تغییر است و درخواست detail برای تمام بازی‌ها نمی‌فرستد.
- جستجو ابتدا MongoDB را با index نوع/توکن و pagination می‌خواند. جستجوی عددی App ID، metadata همان بازی را fetch/cache می‌کند. در نبود نتیجهٔ داخلی، یک درخواست کوچک و cache‌شده به Store Search انجام می‌شود. نتایج آن candidate هستند؛ هنگام افزودن، `type=game` از App Details تأیید می‌شود. DLC یا software هرگز به‌عنوان Game اضافه نمی‌شود.
- `store.steampowered.com/api/appdetails` و `api/storesearch` endpointهای فروشگاه Valve هستند ولی قرارداد رسمی و پایداری Steamworks Web API را ندارند. adapter آنها جداست، پاسخ‌ها validate می‌شوند و شکستشان آرشیو محلی را خراب نمی‌کند. scraper یا دورزدن privacy وجود ندارد.
- metadata در حالت پیش‌فرض ۷ روز معتبر است؛ تغییر اعلام‌شده در catalog هم باعث refresh عندالنیاز می‌شود. دکمهٔ Refresh حداقل ۵ دقیقه فاصله را رعایت می‌کند. metadata قدیمی در اختلال Steam قابل نمایش است؛ retry منفی ۱۵ دقیقه کش می‌شود.
- نام‌ها و metadata فروشگاه فعلاً English با کشور US هستند. تاریخ‌های مبهم Steam مثل Coming Soon یا یک فصل، به تاریخ دقیق ساختگی تبدیل نمی‌شوند. اطلاعات HTML به متن تبدیل می‌شود و هرگز با `dangerouslySetInnerHTML` نمایش داده نمی‌شود.
- محدودیت سراسری محافظه‌کارانه: ۹۰هزار درخواست در روز، ۹۰ درخواست Web API در دقیقه، ۳۵ درخواست Store در دقیقه؛ rate limitهای جدا برای کاربران نیز وجود دارند. این اعداد تضمین ظرفیت Steam نیستند. پاسخ 429/5xx و timeout مدیریت می‌شود؛ حداکثر یک retry با backoff محدود داریم و مقصد/کلید در پیام خطا یا log چاپ نمی‌شود.
- cacheهای مشترک lease در MongoDB دارند؛ instanceهای Vercel یک بازی را هم‌زمان بارها fetch نمی‌کنند. هیچ background promise بعد از response رها نمی‌شود.

## Library Sync و آمار شخصی

هر batch حداکثر ۴۰ بازی فهرست‌شده در catalog یا حداکثر ۲ درخواست جزئیات برای Appهای ناشناخته پردازش می‌کند. برای بازی موجود در catalog، نام/شناسهٔ داخلی برای import کافی است و metadata کامل با بازکردن جزئیات بازی غنی می‌شود. این تصمیم از هزاران درخواست detail در یک sync جلوگیری می‌کند. کتابخانهٔ بزرگ بدون bootstrap کاتالوگ کندتر وارد می‌شود؛ ابتدا bootstrap را انجام دهید.

UI صفحه‌ها را پشت‌سرهم پردازش می‌کند و نتیجه را نمایش می‌دهد. Pause پس از batch جاری متوقف می‌کند؛ بستن صفحه هم صف ذخیره‌شده را از بین نمی‌برد. Resume از همان job ادامه می‌دهد. Cancel فقط موارد باقیمانده را حذف می‌کند و بازی‌های واردشده را نگه می‌دارد. در outage و rate limit، job قابل ادامه می‌ماند. بعد از اتمام، شروع sync بعدی ۵ دقیقه cooldown دارد. حذف بازی در gamdow در sync کامل بعدی ممکن است آن بازی owned را دوباره وارد کند؛ این sync mirror حذف یا ownership revocation نیست.

قبل از تغییر آرشیو از Steam، ذخیرهٔ خودکار باید تمام شده باشد. هنگام عملیات، ویرایش UI موقتاً قفل و در پایان snapshot/revision سرور reload می‌شود؛ حتی اگر آخرین درخواست پس از commit پاسخ نداده باشد. write هم‌زمان در تب دیگر با CAS تشخیص داده می‌شود. Match فقط بر اساس App ID است؛ بازی Manual هم‌نام به‌صورت خودکار تبدیل نمی‌شود.

سه metric مستقل داریم:

- `manualProgress` و `hoursPlayed`: تخمین progress و زمان دستی gamdow، توسط کاربر قابل ویرایش.
- `SteamPlaytime`: دقیقهٔ کل، دو هفتهٔ اخیر و زمان آخرین بازی، فقط در صورت ارائهٔ API. فیلد غایب صفر فرض نمی‌شود.
- `SteamAchievementProgress`: نسبت unlock به تعریف Achievement؛ هرگز Story Progress فرض نمی‌شود.

Achievementها هنگام مشاهدهٔ بازی و بر اساس TTL دریافت می‌شوند؛ schema عمومی یک هفته و نتیجهٔ شخصی پیش‌فرض یک ساعت cache می‌شود. بازی بدون achievement، نبود user stats، private بودن و اختلال موقت حالت‌های جدا دارند؛ در حالت private درصد صفر ساخته نمی‌شود. برای فهرست طولانی، UI ابتدا ۴۰ مورد نمایش می‌دهد. اطلاعات achievementهای مخفی تا درخواست کاربر پنهان است. تصاویر رسمی در بخش جدا از گالری شخصی نمایش داده می‌شوند.

Disconnect نسل اتصال را باطل، job و کش شخصی Steam را حذف می‌کند. بازی‌ها و همهٔ داده‌های gamdow باقی می‌مانند. اتصال دوباره نسل جدید دارد و آمار account قبلی در UI نمایش داده نمی‌شود. یک Steam ID هم‌زمان فقط به یک حساب gamdow متصل می‌شود.

محدودیت ۳MiB آرشیو شخصی قبلی حفظ شده است. متادیتای کامل Steam و فهرست Achievementها داخل این آرشیو ذخیره نمی‌شوند. رسیدن آرشیو به سقف با خطای روشن و امکان export مدیریت می‌شود؛ برای آرشیوهای بسیار بزرگ باید API snapshot موجود به pagination داده‌های شخصی ارتقا پیدا کند. این تغییر عمداً بازنویسی آن بخش نیست.

## قرارداد API

تمام endpointهای شخصی نیازمند session هستند. mutationها کنترل Origin دارند؛ callback ورود با state یکبارمصرف متصل به همان session و اعتبارسنجی پاسخ Steam محافظت می‌شود. API Key هیچ‌گاه جزو response نیست.

| مسیر                       | روش / ورودی                                      | نتیجه                                                                                            |
| -------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `/api/steam/search`        | GET `q`, `offset`                                | نتایج صفحه‌ای با cover، هشدار fallback و وضعیت آمادگی catalog                                    |
| `/api/steam/games`         | POST `{ steamAppId, revision, manualGameId? }`   | افزودن/لینک، snapshot، revision و gameId                                                         |
| `/api/steam/unlink`        | POST `{ gameId, revision }`                      | تبدیل به Manual و بازگردانی metadata اولیه                                                       |
| `/api/steam/games/[appId]` | GET / POST                                       | خواندن cache با refresh عندالنیاز / درخواست refresh کنترل‌شده؛ metadata، playtime و achievements |
| `/api/steam/connection`    | GET / DELETE                                     | وضعیت اتصال / قطع اتصال                                                                          |
| `/api/steam/connect`       | POST                                             | URL ورود Steam؛ ورود به gamdow را جایگزین نمی‌کند                                                |
| `/api/steam/callback`      | GET پاسخ OpenID                                  | اعتبارسنجی و redirect به Profile با نتیجهٔ ثابت و غیرحساس                                        |
| `/api/steam/sync`          | POST `{ action: "start" }`                       | ساخت یا یافتن job جاری                                                                           |
| `/api/steam/sync`          | POST `{ action: "continue" \| "cancel", jobId }` | پردازش batch بعدی / لغو باقیمانده                                                                |
| `/api/steam/catalog/sync`  | GET / POST + `Authorization: Bearer CRON_SECRET` | یک صفحهٔ catalog؛ فقط scheduler/operator                                                         |

ساختار خطا همان `{ error, code }` فعلی است. کدهای قابل تشخیص شامل `STEAM_PRIVATE`, `STEAM_NOT_CONFIGURED`, `STEAM_UNAVAILABLE`, `STEAM_NOT_GAME`, `STEAM_DUPLICATE`, `STEAM_BUSY`, `STEAM_COOLDOWN`, `REVISION_CONFLICT` هستند. metadata عمومی با MongoDB projection به DTO UI تبدیل می‌شود؛ API اصلی Library همچنان قرارداد نسخهٔ ۱ را برمی‌گرداند.

## منابع مرجع

- Steam catalog: https://partner.steamgames.com/doc/webapi/IStoreService
- Owned games و visibility: https://partner.steamgames.com/doc/webapi/iplayerservice
- Schema و player achievements: https://partner.steamgames.com/doc/webapi/ISteamUserStats
- Web API و Service interfaces: https://partner.steamgames.com/doc/webapi_overview
- Steam OpenID: https://steamcommunity.com/dev
- OpenID 2.0 verification: https://openid.net/specs/openid-authentication-2_0.html#verification
- Vercel Cron security: https://vercel.com/docs/cron-jobs/manage-cron-jobs
- Vercel Cron limits: https://vercel.com/docs/cron-jobs/usage-and-pricing
