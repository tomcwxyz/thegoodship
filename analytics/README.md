# @good-ship/analytics

Shared analytics bootstrap for The Good Ship.

## Hosted script

Good Ship pages and subdomains can load the central browser build:

```html
<script async src="https://good-ship.co.uk/analytics/browser.js"></script>
```

The browser build only activates on `good-ship.co.uk` and `*.good-ship.co.uk`. Local development, Vercel previews and unrelated domains are ignored.

## Package API

```js
import { installGoodShipAnalytics } from "@good-ship/analytics";

installGoodShipAnalytics();
```

Pass `{ force: true }` only when deliberately using the Good Ship Plausible property on another approved hostname.

The package uses the existing Plausible tagged script for the `good-ship.co.uk` property and sets no cookies.
