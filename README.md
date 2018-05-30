
# Oxipay Vend Application Proxy


## Contains
- Go Webservice (`main.go`)
- Vend Payments API JavaScript (`assets/js/pay.js`)
- Vend CSS Styles (`assets/css/vend-peg.css`)
- Vend Font Styles (`assets/fonts/*`)
- Vend Payment Imagery (`assets/images/*`)



## Using our Front-end Assets
Your integration will show up in a modal, within Vend’s Sell screen. We would like that experience to feel cohesive so we’re publishing a toolkit along with PEG that will allow you to use Vend-native styles within your integration. 

Each version of PEG will ship with the latest styles from within Vend. 
We will endeavour to publish new versions of PEG whenever our design language receives a noticeable improvement.

1. You can install PEG into your project as a Bower dependency `bower install https://github.com/vend/peg`.
2. Once installed, make sure your Sass build system includes `bower_components` as a load (or include) path. See our `gulpfile` for an example of doing this with node-sass. (`includePaths: 'bower_components'`)
3. Import the PEG styles into your project: `@import 'peg/assets/css/vend-peg.scss'`.

![](./style_guide.png)

## Resources
- [Pay Example Live (Heroku)](https://radiant-everglades-52692.herokuapp.com/)
- [Payments API Getting Started](https://docs.vendhq.com/docs/payments-api-getting-started)
- [Payments API Reference](https://docs.vendhq.com/docs/payments-api-reference)
- [Window.postMessage()](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)

## Licenses
- [MIT License](https://github.com/vend/peg/blob/master/LICENSE)
- [Google Open Source Font Attribution](https://fonts.google.com/attribution)
