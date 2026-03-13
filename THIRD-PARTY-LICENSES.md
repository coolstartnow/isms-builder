# Third-Party Licenses

ISMS Builder incorporates the following third-party components.
All licenses are compatible with the project's AGPL-3.0 license.

---

## UI / Frontend (vendored)

### Phosphor Icons
- **Version:** 1.x (font build)
- **License:** MIT
- **Copyright:** © 2022 Phosphor Icons
- **Files:** `ui/vendor/phosphor-regular.css`, `ui/vendor/Phosphor.ttf`, `ui/vendor/Phosphor.woff`, `ui/vendor/Phosphor.woff2`

### marked
- **Version:** 15.0.12
- **License:** MIT
- **Copyright:** © 2011–2025 Christopher Jeffrey
- **Files:** `ui/vendor/marked.min.js`

---

## Backend / Runtime Dependencies (npm)

### Express
- **Version:** 4.x
- **License:** MIT
- **Copyright:** © 2009–2014 TJ Holowaychuk, © 2013–2014 Roman Shtylman, © 2014–2015 Douglas Christopher Wilson

### bcryptjs
- **Version:** 2.x
- **License:** MIT
- **Copyright:** © 2012 Daniel Wirtz

### jsonwebtoken
- **Version:** 9.x
- **License:** MIT
- **Copyright:** © 2015 Auth0, Inc.

### better-sqlite3
- **Version:** 12.x
- **License:** MIT
- **Copyright:** © 2016–2025 Joshua Wise

### dotenv
- **Version:** 16.x
- **License:** BSD-2-Clause
- **Copyright:** © 2015 Scott Motte

### multer
- **Version:** 2.x
- **License:** MIT
- **Copyright:** © 2014 Hage Yaapa

### nodemailer
- **Version:** 8.x
- **License:** MIT-0 (no attribution required)
- **Copyright:** © 2021 Andris Reinman

### pdf-parse
- **Version:** 1.1.1 (pinned)
- **License:** MIT
- **Copyright:** © Mehmet Kozan

### qrcode
- **Version:** 1.x
- **License:** MIT
- **Copyright:** © 2012 Ryan Day

### xml2js
- **Version:** 0.6.x
- **License:** MIT
- **Copyright:** © 2010–2025 Marek Kubica

### mysql2 _(optional dependency)_
- **Version:** 3.x
- **License:** MIT
- **Copyright:** © 2012 Andrey Sidorov
- **Note:** Only installed when `STORAGE_BACKEND=mariadb` is used

---

## Development Dependencies (not included in production builds)

| Package | Version | License |
|---|---|---|
| jest | 30.x | MIT |
| supertest | 7.x | MIT |
| puppeteer | 24.x | Apache-2.0 |

---

## MIT License Text

The MIT License text (applicable to all MIT-licensed components above):

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## BSD-2-Clause License Text (dotenv)

```
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED.
```

## Apache-2.0 License (puppeteer — dev only)

Puppeteer is used exclusively as a development/test dependency and is not
distributed with or bundled into the production application.
