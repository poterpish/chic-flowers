# Chic Flowers Website

## Project Description

This project is a student website created for Chic Flowers, a flower shop in Astana, Kazakhstan.

The website allows visitors to learn about the flower shop, browse flower arrangements, view prices, and find information about ordering and contacting the shop.

This project was created for the Introduction to Web Technologies course.

## Assignment 3

In Assignment 3, the existing website was updated using Bootstrap.

Bootstrap is used for:
- responsive page layouts;
- containers, rows, and columns;
- responsive navigation;
- buttons;
- typography;
- spacing and alignment;
- utility classes;
- responsive behaviour at different screen sizes.

The custom CSS from Assignment 2 was reduced. Bootstrap now handles most of the layout, spacing, alignment, navigation, and button styling. Custom CSS is used mainly for the Chic Flowers visual identity and small corrections.

## Bootstrap

The project uses Bootstrap 5 through a CDN.

Bootstrap CSS is loaded before the project's custom stylesheet so that the custom styles can make small corrections when necessary.

The Bootstrap JavaScript bundle is also included for Bootstrap components such as the responsive navigation and modal.

## Responsive Design

The website is designed to work at three main screen sizes:

- Phone: approximately 375px
- Tablet: approximately 768px
- Desktop: normal desktop window

The Bootstrap grid system is used to change the number and size of columns depending on the screen width.

The navigation collapses into a toggler on smaller screens.

## Website Pages

The website contains four pages:

- `index.html` — Home page
- `catalog.html` — Flower catalog and prices
- `order.html` — Order and contact information
- `blog.html` — Flower Journal with flower tips and care articles

## Team Members

### Alua Kurmanbay

Responsible for:
- `index.html`
- `catalog.html`
- Bootstrap layout for the Home page
- Bootstrap layout for the Catalog page
- responsive product cards
- responsive navigation
- Bootstrap utilities and components on these pages
- reducing `alua.css`

### Gauhar Mukhametbay

Responsible for:
- `order.html`
- `blog.html`
- Order & Contact page
- Flower Journal page
- project documentation for these pages

## Project Structure

```text
project/
├── index.html
├── catalog.html
├── order.html
├── blog.html
├── css/
│   ├── base.css
│   ├── alua.css
│   └── gauhar.css
├── img/
├── removed-css.txt
└── README.md

## User Journeys

### Journey 1 — Browse and Order Flowers
1. The visitor opens the Home page.
2. The visitor goes to the Catalog page.
3. The visitor chooses a flower category and views bouquets and prices.
4. The visitor opens the Order & Contact page.
5. The visitor fills in the order form and submits the order.
6. An order confirmation message appears.

### Journey 2 — Read Flower Tips
1. The visitor opens the Home page.
2. The visitor goes to the Blog page.
3. The visitor chooses an article.
4. The visitor clicks Read More.
5. The visitor reads the full flower article.

### Journey 3 — Find Contact Information
1. The visitor opens the Order & Contact page.
2. The visitor views the Chic Flowers locations.
3. The visitor checks the opening hours and contact information.
4. The visitor can use the provided contact information to contact the flower shop.

## Quality Pass

The website was reviewed to make sure the main visitor flows work correctly.

- Checked navigation links on all pages.
- Checked the website on phone and desktop screen sizes.
- Fixed broken and outdated links.
- Removed unfinished content and old Colophon references.
- Checked the Order form and Blog article links.
- Made the navigation and footer consistent across the website.
- Checked that images load correctly.
- Checked that there is no horizontal overflow on mobile screens.

## Midterm Project Status

The Chic Flowers website contains four completed pages:

- `index.html` — Home
- `catalog.html` — Flower Catalog
- `order.html` — Order & Contact
- `blog.html` — Flower Journal

The website uses Bootstrap for responsive layout, navigation, buttons, spacing, and other interface components. Custom CSS is used for the visual style and small corrections.

The website was tested on phone and desktop screen sizes. Navigation, page links, the Order form, and Blog article links were checked.

The HTML and CSS structure is prepared for future JavaScript functionality.