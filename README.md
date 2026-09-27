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
- `colophon.html` — Project information and authorship

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
- `colophon.html`
- Order & Contact page
- Colophon page
- project documentation for these pages

## Project Structure

```text
project/
├── index.html
├── catalog.html
├── order.html
├── colophon.html
├── css/
│   ├── base.css
│   ├── alua.css
│   └── gauhar.css
├── img/
├── removed-css.txt
└── README.md
