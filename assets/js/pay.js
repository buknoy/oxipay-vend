'use strict'

var Severity = Object.freeze({"EMERGENCY":0, "ALERT":1, "CRITICAL":2, "ERROR": 3, "WARNING": 4, "NOTICE": 5, "INFO": 6,"DEBUG":7})


var logLevel = Severity.INFO

// define a new console
var console=(function(oldCons){
    return {
        log: function(text){
            oldCons.log(text);
        },
        info: function (text) {

            oldCons.info(text);
            // Your code
        },
        warn: function (text) {
            oldCons.warn(text);
            // Your code
        },
        error: function (text) {
            oldCons.error(text);
            // Your code
        }
    };
}(window.console));

//Then redefine the old console
window.console = console;

/* global $, jQuery, window */
/* eslint-env es6, quotes:single */

// Handles payment flow communication to Vend via the Payments API.
// Documentation: https://docs.vendhq.com/docs/payments-api-reference

// Send postMessage JSON payload to the Payments API.
function sendObjectToVend(object) {
  // Define parent/opener window.
  var receiver = window.opener !== null ? window.opener : window.parent
  // Send JSON object to parent/opener window.

  // this needs to match the site
  // receiver.postMessage(JSON.stringify(object), 'https://amtest.vendhq.com')
  console.log("site " + window.location.search)
  var params = getURLParameters()
  receiver.postMessage(JSON.stringify(object), "*")
}

// Payments API Steps.
// https://docs.vendhq.com/docs/payments-api-reference#section-required
// ACCEPT: Trigger a successful transaction. If the payment type supports
// printing (and it is enabled) an approved transaction receipt will also print,
// containing any of the addition receipt_html_extra that is specified.
// The transaction_id of the external payment should also be specified, as this
// can be later retrieved via the REST API.
function acceptStep(receiptHTML, transactionID) {
  console.debug('sending ACCEPT step')
  sendObjectToVend({
    step: 'ACCEPT',
    transaction_id: transactionID,
    receipt_html_extra: receiptHTML
  })
}

// DATA: Request additional information from Vend about the sale, payment and
// line items. This is often used to obtain the register_id that processed the
// transaction, as it is the best unique identifier to pair a terminal with.
// This means that if the gateway is storing pairings between a register and a
// terminal, then there is a way to route the payment correctly.
function dataStep() {
  console.log('sending DATA step')
  sendObjectToVend({
    step: 'DATA'
  })
}

// DECLINE: Return to pay screen and if enabled a declined transaction receipt
// will also print, including the receipt_html_extra specified. It is important
// to print at this stage to make sure terminal output is included on the
// receipt.
function declineStep(receiptHTML) {
  console.log('sending DECLINE step')
  sendObjectToVend({
    step: 'DECLINE',
    print: false,
    receipt_html_extra: receiptHTML
  })
}

// EXIT: Cleanly exit the process. Does not close the window but closes all
// other dialogs including the payment modal/iFrame and unbinds postMessage
// handling. It is better to avoid using this step, as it breaks the transaction
// flow prematurely, and so should only be sent if we are absolutely sure that
// we know the transaction outcome.
function exitStep() {
  console.log('sending EXIT step')
  sendObjectToVend({
    step: 'EXIT'
  })
}

// PRINT: Manually trigger a receipt, including any extra information specified.
// This step is not often needed as ACCEPT and DECLINE both include receipt
// printing. It can however be used to print a signature slip midway through
// processing if signature is required by the card verifiction method, in this
// case receipt_html_extra would be used to print a signature line.
function printStep(receiptHTML) {
  console.log('sending PRINT step')
  sendObjectToVend({
    step: 'PRINT',
    receipt_html_extra: receiptHTML
  })
}

// SETUP: Customize the payment dialog. At this stage removing close button to
// prevent cashiers from prematurely closing the modal is advised, as it leads
// to interrupted payment flow without a clean exit.
function setupStep() {
  console.log('sending SETUP step')
  sendObjectToVend({
    step: 'SETUP',
    setup: {
      enable_close: false
    }
  })
}

// Get query parameters from the URL. Vend includes amount, origin, and
// register_id.
function getURLParameters() {
  var pageURL = decodeURIComponent(window.location.search.substring(1)),
    params = pageURL.split('&'),
    paramName,
    parameters = {}

  params.forEach(function (param) {
    paramName = param.split('=')

    console.log(paramName)

    switch (paramName[0]) {
      case 'amount':
        parameters.amount = paramName[1]
        break
      case 'origin':
        parameters.origin = paramName[1]
        break
      case 'register_id':
        parameters.register_id = paramName[1]
        break
    }
  })

  console.log(parameters)

  return parameters
}



// Check response status from the gateway, we then manipulate the payment flow
// in Vend in response to this using the Payment API steps.
function checkResponse(response) {
  debugger;
  var response = response;
  switch (response.status) {
    case 'ACCEPTED':
      $('#statusMessage').empty()


      if (response.id == 0) {
        receiptHTML = `
        <div>
          <h2>APPROVED</h2>
          <span>Oxipay Purchase #: ` + response.id+ ` </span>
        </div>`;
      }      
      acceptStep(receiptHTML, response.id)
      break
    case 'DECLINED':
      $('#statusMessage').empty()
      $.get('/assets/templates/declined.html', function (data) {
        data = data.replace("${response.status}", response.status.toLowerCase());
        data = data.replace("${response.message}", response.message);

        $('#statusMessage').append(data)
      })

      setTimeout(declineStep, 4000, '<div>Declined</div>')
      break
    case 'FAILED':
      
      $('#statusMessage').empty()
      $.get('/assets/templates/failed.html', function (data) {
        data = data.replace("${response.status}", response.status.toLowerCase());
        data = data.replace("${response.message}", response.message);
        $('#statusMessage').append(ret)
      })
      receiptHTML = `
        <div>
            <h2>DECLINED</h2>
            <span> ` + response.message + `</span>
        </div>`;

      setTimeout(declineStep, 4000, receiptHTML)
      break
    case 'TIMEOUT':
      $('#statusMessage').empty()
      $.get('../assets/templates/timeout.html', function (data) {
        $('#statusMessage').append(data)
      })

      setTimeout(declineStep, 4000, '<div>CANCELLED</div>')
      break
    default:
      $('#statusMessage').empty()
      $.get('../assets/templates/failed.html', function (data) {
        $('#statusMessage').append(data)
      })

      setTimeout(declineStep, 4000, receiptHTML)
      break
  }
}

var refundDataResponseListener = function (event) {
    
    var result = getURLParameters()

    if (event.origin !== result.origin ) {
        return false;
    }
    
    console.log('received event from Vend')
    console.log('event origin ' + event.origin)

    var data = JSON.parse(event.data)
    // get sales id. save into a gloabal const

    console.log(data)

    var data = {
        amount: result.amount,
        origin: result.origin,
        sale_id: data.register_sale.client_sale_id,
        register_id: result.register_id,
        purchaseno: $("#purchaseno").val()
    };
    
    $.ajax({
        url: '/refund',
        type: 'POST',
        dataType: 'json',
        data: data
    })
    .done(function (response) {
        console.log(response)

        // Hide outcome buttons while we handle the response.
        $('#outcomes').hide()

        // Check the response body and act according to the payment status.
        checkResponse(response)
    })
    .fail(function (error) {
        console.log(error)

        // Make sure status text is cleared.
        $('#outcomes').hide()
        $('#statusMessage').empty()
        $.get('../assets/templates/failed.html', function (data) {
          $('#statusMessage').append(data)
        })
        // Quit window, giving cashier chance to try again.
        setTimeout(declineStep, 4000)
    })
}


var paymentDataResponseListener = function (event) {

    var result = getURLParameters()
    
    if (event.origin !== result.origin ) {
        return false;
    }
    
    console.log('received event from Vend')
    console.log('event origin ' + event.origin)

    var data = JSON.parse(event.data)

    // get sales id. save into a gloabal const
    console.log("In my event listener " + data)

    var paymentCode = $("#paymentcode").val()

    // Hide outcome buttons.
    $('#outcomes').hide()
  
    // If we did not at least two query params from Vend something is wrong.
    if (Object.keys(result).length < 2) {
      console.log('did not get at least two query results')
      $('#statusMessage').empty()
      $.get('../assets/templates/failed.html', function (data) {
        $('#statusMessage').append(data)
      })
      setTimeout(exitStep(), 4000)
    }
    
    $.ajax({
        url: '/pay',
        type: 'POST',
        dataType: 'json',
        data: {
          amount: result.amount,
          origin: result.origin,
          register_id: result.register_id,
          sale_id: data.register_sale.client_sale_id,
          paymentcode: paymentCode
        }
      })
      .done(function (response) {
        debugger;
        console.log(response)
  
        // Hide outcome buttons while we handle the response.
        $('#outcomes').hide()
  
        // Check the response body and act according to the payment status.
        checkResponse(response)
      })
      .fail(function (error) {
        debugger;
        console.log(error)
  
        // Make sure status text is cleared.
        $('#outcomes').hide()
        $('#statusMessage').empty()
        $.get('../assets/templates/failed.html', function (data) {
            $('#statusMessage').append(data)
        })
        // Quit window, giving cashier chance to try again.
        setTimeout(declineStep, 4000)
      })

}

// sendRefund sends refund to the gateway
function sendRefund() {
    debugger
    // grab the purchase no from form
    var paymentCode = $("#paymentcode").val()
  
    // Hide outcome buttons.
    $('#outcomes').hide()
    
  
    // Show tap insert or swipe card prompt.
    $('#statusMessage').empty()
    $.get('../assets/templates/payment.html', function (data) {
      $('#statusMessage').append(data)
    })
    // Get the payment context from the URL query string.
    var result = {}
    result = getURLParameters()
  
    // If we did not at least two query params from Vend something is wrong.
    if (Object.keys(result).length < 2) {
      console.log('did not get at least two query results')
      $('#statusMessage').empty()
      $.get('../assets/templates/failed.html', function (data) {
        $('#statusMessage').append(data)
      })
      setTimeout(exitStep(), 4000)
    }
  
    // We are going to send a data steup so we dynammically bind a listener so that we aren't 
    // subscribing to all events
    window.addEventListener(
      'message',
      refundDataResponseListener,
      false
    )
  
    // send the datastep
    if (inIframe()) {
      dataStep();
    } else  {
      // we are outside the iframe
      // and won't receive a message. We need to trigger it manually
      refundDataResponseListener();
    }
    
    return false
}

function inIframe () {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

function sendPayment() {
    // grab the purchase no from form
    var paymentCode = $("#paymentcode").val()
  
    // Hide outcome buttons.
    $('#outcomes').hide()
    
  
    // Show tap insert or swipe card prompt.
    $('#statusMessage').empty()
    $.get('../assets/templates/payment.html', function (data) {
      $('#statusMessage').append(data)
    })
    // Get the payment context from the URL query string.
    var result = {}
    result = getURLParameters()
  
    // If we did not at least two query params from Vend something is wrong.
    if (Object.keys(result).length < 2) {
      console.log('did not get at least two query results')
      $('#statusMessage').empty()
      $.get('../assets/templates/failed.html', function (data) {
        $('#statusMessage').append(data)
      })
      setTimeout(exitStep(), 4000)
    }
  
      // We are going to send a data steup so we dynammically bind a listener so that we aren't 
      // subscribing to all events
      window.addEventListener('message', paymentDataResponseListener, false)
      
    // send the datastep
    if (inIframe()) {

      dataStep();
    } else  {
      console.log("It does not appear this is contained in an iframe. This is unexpected and will not currently work.")
    }
    
    return false
}

function cancelRefund(outcome) {
    console.log('cancelling refund')
  
    // Hide outcome buttons.
    $('#outcomes').hide()
  
    // Show the cancelling with a loader.
    $('#statusMessage').empty()
    $.get('../assets/templates/cancelling.html', function (data) {
      $('#statusMessage').append(data)
    })
  
    // Wait four seconds, then quit window, giving the cashier a chance to try
    // again.
    setTimeout(declineStep, 4000, '<div>CANCELLED</div>')
  }

// cancelPayment simulates cancelling a payment.
function cancelPayment(outcome) {
  console.log('cancelling payment')

  // Hide outcome buttons.
  $('#outcomes').hide()

  // Show the cancelling with a loader.
  $('#statusMessage').empty()
  $.get('../assets/templates/cancelling.html', function (data) {
    $('#statusMessage').append(data)
  })

  // Wait four seconds, then quit window, giving the cashier a chance to try
  // again.
  setTimeout(declineStep, 4000, '<div>CANCELLED</div>')
}


function showClose() {
  sendObjectToVend({
    step: 'SETUP',
    setup: {
      enable_close: true
    }
  })
}

function seeForm() {
  // Since we cannot navigate away from this screen and it does not close
  // automatically, show the close modal button.
  showClose();

  // Hide outcome buttons.
  $('#outcomes').hide()

  // Show the cancelling with a loader.
  $('#statusMessage').empty()
  $.get('../assets/templates/forms.html', function (data) {
    $('#statusMessage').append(data)
  });
}

// On initial load of modal, configure the page settings such as removing the
// close button and setting the header.
$(function () {

  // Send the SETUP step with our configuration values..  
  setupStep()

  $('#statusMessage').empty()
  $.get('../assets/templates/waiting.html', function (data) {
    $('#statusMessage').append(data)
  })

  // Show outcome buttons.
  $('#outcomes').show()
})