# Kate's Cookies website

A Jekyll site for a small home cookie bakery, built to deploy on GitHub Pages.

## Editing content

| What | Where |
| --- | --- |
| Business name, email, phone, location, social links | `_config.yml` |
| Menu (cookies, prices per dozen, categories, featured items) | `_data/cookies.yml` |
| FAQ on the cart page | `_data/faq.yml` |
| Cart / order form behavior | `assets/js/cart.js` |
| Home page | `index.html` |
| About page | `about.md` |
| Colors and fonts | `assets/css/main.scss` (variables at top) |

**Photos:** drop a photo in `assets/images/` and add `image: /assets/images/your-photo.jpg`
to that cookie in `_data/cookies.yml`. Cookies without a photo get a drawn illustration
using their `dough` and `chips` colors.

**Cart & ordering:** each cookie card has a 1–99 dozen dropdown and an "Add to cart" button.
The cart is saved in the visitor's browser (`localStorage`), so it survives page reloads and
return visits on the same device. The cart page lists the items (editable), an estimated total,
and the order form. The order is sent as a hidden `order` field (e.g. `2 dozen Snickerdoodle ($30)`)
plus `estimated_total`.

- **Without a form service** (the default), submitting opens the customer's email app with the
  whole order filled in, addressed to `email` in `_config.yml`.
- **With [Formspree](https://formspree.io):** create a form, then set `formspree_id` in
  `_config.yml`. Orders are posted in the background, a thank-you message is shown, and the
  cart is cleared. Any similar service that accepts a form POST and returns JSON works too:
  change the form's `action` in `cart.html`.

`price` in `_data/cookies.yml` must be a plain number (dollars per dozen). Renaming a cookie
changes its cart ID, so it will drop out of any carts that already contain it.

**Cottage food notice:** `cottage_food_notice` in `_config.yml` appears in the footer.
Check your state's cottage food rules for the exact wording you need.

## Running locally

```sh
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**, set **Source** to "Deploy from a branch",
   and choose `main` / `(root)`.
3. If the site will live at `https://<user>.github.io/<repo>/`, set `baseurl: "/<repo>"`
   in `_config.yml`. For a custom domain, leave `baseurl` empty and add the domain under
   Settings → Pages (GitHub will create a `CNAME` file).
