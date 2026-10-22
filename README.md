# Dvary Web (Render)

Website ya pairing. **Haihifadhi session yoyote** - inaomba tu code kutoka kwa bot yako (Pterodactyl).
Sessions zote za WhatsApp zinabaki kwenye `data/auth` ya bot.

```
Mtu -> Website (Render) --(ombi lenye saini)--> Bot (Pterodactyl) -> WhatsApp
                                                  |
                                                  +-> sessions zinahifadhiwa hapa (data/auth)
```

## 1. Bot (Pterodactyl) - fanya kwanza
1. Weka `DvaryBot-v38.zip` (bila kufuta folda ya `data/`).
2. Tengeneza secret ndefu (kwenye kompyuta yoyote yenye Node):
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. Kwenye `.env` ya bot (au Startup/Variables za panel) weka:
   `REMOTE_API_SECRET=<secret yako>`
4. Restart bot. Hakikisha port ya bot (mfano `8081`) inapatikana kutoka nje: `http://node.dvary.space:8081/health` ifunguke.
5. Jaribu API: `node tools/remote-test.js http://node.dvary.space:8081 <secret> health`
   Inapaswa kujibu `HTTP 200` na `"success":true`.

## 2. GitHub
1. Tengeneza repo mpya (Private inatosha).
2. Weka faili za folda hii (`DvaryWeb`) kwenye repo - **usiweke `.env` wala secret**.

## 3. Render
1. New + -> **Web Service** -> chagua repo.
2. Build: `npm install` - Start: `npm start` (au tumia `render.yaml`).
3. Environment:
   - `BOT_API_URL` = `http://node.dvary.space:8081` (anwani ya bot yako, bila `/` mwishoni)
   - `REMOTE_API_SECRET` = secret ile ile ya bot
4. Deploy. Fungua link ya Render, weka namba, upate code.

## Mambo ya kujua
- **Render free huzima ukurasa baada ya muda bila wageni** (huchukua ~30-60s kuamka). Bot haiathiriki - iko Pterodactyl.
- **HTTP si HTTPS:** ukitumia `http://node...:8081`, ombi linasafiri bila encryption. Secret haionekani (saini tu), lakini code ya pairing inasafiri wazi kati ya bot na Render. Kama una domain/Cloudflare, weka HTTPS mbele ya bot na ubadilishe `BOT_API_URL` iwe `https://...`.
- Ulinzi uliopo: kila mtu anaruhusiwa maombi 5 kwa dakika 10; bot inakataa ombi lisilo na saini sahihi; pairing zinazosubiri zina kikomo.
- Ukitaka website pekee ndiyo iwe mlango: weka `PAIR_PUBLIC=false` kwenye bot.
