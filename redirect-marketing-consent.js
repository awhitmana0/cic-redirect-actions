/**

* Handler that will be called during the execution of a PostLogin flow.

*

* @param {Event} event - Details about the user and the context in which they are logging in.

* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.

* Functionality: Check if the user has added the necessary details to their profile and prompt them for those values if they have not. 

*/

const QUESTION_SET_ID = "question_set_1";

 

exports.onExecutePostLogin = async (event, api) => {

 

// INITIAL CHECK

// Confirm secrets are set

// Confirm the user is either logging in for the first time OR has not completed filling out their profile

 

  if (!event.secrets.SESSION_TOKEN_SECRET || !event.secrets.FORM_URL) {

    console.log('Missing required configuration. Skipping.');

  return;

  }

 

  var question_sets_completed = event.user.app_metadata["question_sets_completed"] ?? [];

 

  console.log(event.stats.logins_count)

  if (event.stats.logins_count > 2){

    if (question_sets_completed.includes(QUESTION_SET_ID)){

      return;

    }

  }

  else{

    return

  }

 

// SETUP FORM 

// Add existing profile attributes to form if half filled in and then configure the external form for the user. 

  const theme = {

        "css_variables": {

          "primary-color-rgb": "50,80,115",

          "primary-color": "rgb(50, 80, 115)",

          "page-background-color": "#f0aa7d"

        },

        "logo_element": '<img class="ca89adc79 c69cd914d" id="prompt-logo-center" src="https://identicons.dev/identicons/mono/svg/icon-empathy.svg" alt="Custom Logo" style="height: 52px;">',

        "auto_generate": false

      };

  const prog_profile = {

  // event: event, // Pass the event object

  title: "Additional Information",

  heading: "Marketing Permissions",

  lead: "We will use the information you provide on this form to be in touch with you and to provide updates and marketing.",

  button_text: "Submit",

  theme: theme,

  inputs:[

    {html: "<p>Please let us know all the ways you would like to hear from us:</p>"},

    {type: "checkbox", label: "<p>Email<br>We will send you occasional emails about promotions, new products and important updates to keep you in the loop.</p>", metadata_key: "email_contact", value: true, current: false},

    {type: "checkbox", label: "<p>Customized online advertising<br>We will use your information to show you ads that are more relevant to you to improve your online experience.</p>", metadata_key: "custom_marketing_content", value: true, current: false},

    {type: "switch", label: "Subscribe to our general newsletter", metadata_key: "subscribed", value: true, current: false},

    {html: "<p>By clicking below to submit this form, you acknowledge that the information you provide will be processed in accordance with our Privacy Policy.</p>"},

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

  const skipped_claims = ["state", "action"];

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

  // Add question set to list of sets already completed.

  var question_sets_completed = event.user.app_metadata["question_sets_completed"] ?? [];

  question_sets_completed.push(QUESTION_SET_ID)

  api.user.setAppMetadata("question_sets_completed", question_sets_completed);

 

};