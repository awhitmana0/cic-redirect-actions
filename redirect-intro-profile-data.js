
/**

* Handler that will be called during the execution of a PostLogin flow.

*

* @param {Event} event - Details about the user and the context in which they are logging in.

* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.

* Functionality: Check if the user has added the necessary details to their profile and prompt them for those values if they have not. 

*/

 

exports.onExecutePostLogin = async (event, api) => {

 

// INITIAL CHECK

// Confirm secrets are set

// Confirm the user is either logging in for the first time OR has not completed filling out their profile

 

// FORM_URL = https://CUSTOM_PAGE_URL/prog/universal

 

  if (!event.secrets.SESSION_TOKEN_SECRET || !event.secrets.FORM_URL) {

    console.log('Missing required configuration. Skipping.');

  return;

  }

  const should_ask_again = event.user.app_metadata["user_info_missed"] ?? true;

  const current_first_name = event.user.user_metadata["first_name"] ?? undefined;

  const current_last_name = event.user.user_metadata["last_name"] ?? undefined;

  const current_city = event.user.user_metadata["city"] ?? undefined;

 

  console.log(event.stats.logins_count)

  if (event.stats.logins_count > 1){

    if (should_ask_again === false){

      return;

    }

  }

 

// SETUP FORM 

// Add existing profile attributes to form if half filled in and then configure the external form for the user. 

  const theme = {

        "css_variables": {

          "primary-color-rgb": "40,40,100",

          "primary-color": "rgb(40, 40, 100)",

          "page-background-color": "#c9cace"

        },

        "logo_element": '<img class="ca89adc79 c69cd914d" id="prompt-logo-center" src="https://cdn.demo.okta.com/images/okta-icon.png" alt="Custom Logo" style="height: 52px;">',

        "auto_generate": false

      };

  const prog_profile = {

  // event: event, // Pass the event object

    title: "Additional Information",

  heading: "Tell us more about yourself!",

  lead: "<p>To help provide you the best experience possible can you please provide us some additional information we can associate with your account.",

  button_text: "Continue",

  theme: theme,

  inputs:[

  {type: "text", label: "First Name", metadata_key: "first_name", current: current_first_name},

  {type: "text", label: "Last Name", metadata_key: "last_name", current: current_last_name},

  {type: "text", label: "City", metadata_key: "city", current: current_city}

  ]

  };

 

// SETUP SESSION TOKEN TO SEND OVER AND SIGN WITH SHARED SECRET

    const sessionToken = api.redirect.encodeToken({

  secret: event.secrets.SESSION_TOKEN_SECRET ,

  payload: {

  iss: `https://${event.request.hostname}/`,

  subject: event.user.user_id,

  audience: event.secrets.FORM_URL,

  expiresIn: '5 minutes',

  data: prog_profile

      },

    });

  // console.log(sessionToken);

// PERFORM REDIRECT TO EXTERNAL PAGE WITH SESSION TOKEN

  api.redirect.sendUserTo(event.secrets.FORM_URL, {

  query: {

  session_token: sessionToken,

  redirect_uri: `https://${event.request.hostname}/continue`,

      },

    });

};

 

// FINAL VALIDATION ON RETURN

// OnContinuePostLogin runs when the external page passes back the response and matching state param.

 

exports.onContinuePostLogin = async (event, api) => {

  const app_metadata_values = [];

  const skipped_claims = ["user_info_skipped", "state", "action"];

  let decodedToken;

  try {

decodedToken = api.redirect.validateToken({

secret: event.secrets.SESSION_TOKEN_SECRET,

tokenParameterName: 'session_token',

    });

  } catch (error) {

  // console.log(error.message);

    return api.access.deny('Error occurred during redirect.');

  }

  var customClaims = decodedToken.other;

  // console.log(customClaims);

 

  // Set response values into the user metadata or app metadata.

  for (const [key, value] of Object.entries(customClaims)){

    console.log(key);

    if (!skipped_claims.includes(key)){

      if (app_metadata_values.includes(key)){

        api.user.setAppMetadata(key, value);

    }

    else{

      api.user.setUserMetadata(key, value);

    }

    }

 

  }

  // Check if First Name, Last Name, City not entered and flag for next time. 

  var user_info_missed = true

  if (customClaims["first_name"] && customClaims["last_name"] && customClaims["city"]){

      user_info_missed = false;

    }

  api.user.setAppMetadata("user_info_missed", user_info_missed);

 

};