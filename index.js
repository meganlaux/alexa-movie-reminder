'use strict';
const Alexa = require('alexa-sdk');
const APP_ID = 'amzn1.ask.skill.eddd5eea-e87b-4027-b540-6f055896b2d3';

//This is the welcome message for when a user starts the skill without a specific intent.
const WELCOME_MESSAGE = "Hello. Would you like to hear your list of saved movies?";
//This is the message a user will hear when they ask Alexa for help in your skill.
const HELP_MESSAGE = "You can ask me things like add a movie to my list or what are my saved movies.";

const states = {
  UPDATE_COF: "_UPDATE_COF",
  ADD_MOVIE: "_ADD_MOVIE",
  LIST_MOVIES: "_LIST_MOVIES"
};

var config = {
  apiKey: "AIzaSyCmlaV5Hs8Vey-qA_Ix0YIZeCA6Cqrjhj4",
  authDomain: "moviereminder-5f8d7.firebaseapp.com",
  databaseURL: "https://moviereminder-5f8d7.firebaseio.com",
  projectId: "moviereminder-5f8d7",
  storageBucket: "moviereminder-5f8d7.appspot.com",
  messagingSenderId: "70567543719"
};

var firebase = require("./node_modules/firebase")
firebase.initializeApp(config);
console.log("Initialized firebase app with: " + JSON.stringify(config));
let database = firebase.database();

// This is the handler that is invoked for intent matching when there is
// no state presenet in the conversation attributes
const rootHandler = {
  "LaunchRequest": function () {
    this.response.speak(WELCOME_MESSAGE).listen(HELP_MESSAGE);
    this.emit(":responseReady");
  },
  "AddMovieIntent": function () {
    console.log("Hit root:AddMovieIntent");
    if (this.event.request.dialogState !== "COMPLETED"){
      delegateSlotCollection.call(this);
    } else {
      this.handler.state = states.ADD_MOVIE;
      this.emitWithState('StartIntent');
    }
  },
  "MovieListIntent": function () {
    console.log("Hit root:MovieListIntent");
    this.handler.state = states.LIST_MOVIES;
    this.emitWithState('StartIntent');
  },
  "AMAZON.HelpIntent": function () {
    console.log("Hit root:HelpIntent");
    this.response.speak(HELP_MESSAGE).listen(HELP_MESSAGE);
    this.emit(":responseReady");
  },
  "SessionEndedRequest": function () {
    console.log("Hit root:SessionEndedRequest");
    this.handler.state = '';
  },
  "Unhandled": function () {
    console.log("Hit root:Unhandled");
    this.handler.state = '';
    this.emitWithState("LaunchRequest");
  }
};

const addMovieHandler = Alexa.CreateStateHandler(states.ADD_MOVIE, {
  "StartIntent": function () {
    if (this.event.session.application.applicationId === APP_ID) {

      console.log("Hit addMovieHandler:StartIntent function");

      this.event.session.attributes.movieTitle = this.event.request.intent.slots.movieTitle.value;
      console.log("movieTitle slot value: " + this.event.session.attributes.movieTitle);

      var speech = "Ok I added " + this.event.session.attributes.movieTitle + " to your movie list.";

      let content = {
        "hasDisplaySpeechOutput": speech,
        "hasDisplayRepromptText": speech,
        "simpleCardTitle": "Add movie to list",
        "simpleCardContent": this.event.session.attributes.movieTitle + " was added to your movie list.",
        "backgroundImageUrl": "https://s3.amazonaws.com/meganlaux.moviereminder/1.png",
        "templateToken": "FullScreenImage",
        "askOrTell": ":ask",
        "sessionAttributes": this.attributes
      };

      var userMovies = this.event.session.attributes.userMovies;
      var newMovie = this.event.session.attributes.movieTitle;
      var user = this.event.session.user.userId.split('.').join('');
      console.log("User: " + user);

      var reference = database.ref().child('userMovies/' + user).push(); // insert new element in array

      reference.set(newMovie).then(() => { // set the value of the new element
        this.handler.state = ''; // reset state so that either intent can be invoked from root
        renderTemplate.call(this, content);
      },
        (err) => {
        console.error("Error returning reference from Firebase once function");
      });

    } else {
      console.error("Session app ID does not match skill app ID.")
    }
  },
  // "YesIntent": function () {
  //   console.log("Hit addMovieHandler:Yes function");
  //   var speech = "Ok I added " + this.event.session.attributes.movieTitle + " to your list of movies.";
  //   let content = {
  //     "hasDisplaySpeechOutput": speech,
  //     "hasDisplayRepromptText": speech,
  //     "simpleCardTitle": "Movie added to list",
  //     "simpleCardContent": `Movie added to list.`,
  //     "backgroundImageUrl": "https://s3.amazonaws.com/meganlaux.moviereminder/1.png",
  //     "templateToken": "FullScreenImage",
  //     "askOrTell": ":ask",
  //     "sessionAttributes": this.attributes
  //   };
  //   this.handler.state = states.UPDATE_COF;
  //   renderTemplate.call(this, content);
  // },
  "Unhandled": function () {
      this.response.speak('OK have a great day');
      this.emit(":responseReady");
  },
});

const listMoviesHandler = Alexa.CreateStateHandler(states.LIST_MOVIES, {
  "StartIntent": function () {
    if (this.event.session.application.applicationId === APP_ID) {

      console.log("Hit listMoviesHandler:StartIntent function");

      var userMoviesObject;
      var userMoviesString = '';
      var user = this.event.session.user.userId.split('.').join('');
      console.log("User: " + user);

      var reference = database.ref().child('userMovies/' + user).once("value", function(snapshot) {
        userMoviesObject = snapshot.val();

        if (userMoviesObject) {
          for (var key in userMoviesObject) {
              userMoviesString += userMoviesObject[key] + ', ';
          }
          userMoviesString = userMoviesString.slice(0, -2); // remove extra ', ' from end of string
          console.log("userMovies from firebase: " + userMoviesString);
        }

      });

      reference.then(() => {

        if (userMoviesString.length > 0) {
          var speech = "Here is your movie list. " + userMoviesString.split(',').join('.');
        } else {
          var speech = "You haven't added any movies to your list yet. When you find a movie you want to save, try saying: Add a movie to my list.";
        }

        let content = {
          "hasDisplaySpeechOutput": speech,
          "hasDisplayRepromptText": speech,
          "simpleCardTitle": "Your movie list",
          "simpleCardContent": "Here is your movie list: " + userMoviesString,
          "backgroundImageUrl": "https://s3.amazonaws.com/meganlaux.moviereminder/1.png",
          "templateToken": "FullScreenImage",
          "askOrTell": ":ask",
          "sessionAttributes": this.attributes
        };

        this.event.session.attributes.userMovies = userMoviesObject;
        console.log("userMovies stored in session: " + this.event.session.attributes.userMovies);

        this.handler.state = ''; // reset state so that either intent can be invoked from root
        renderTemplate.call(this, content);
      },
        (err) => {
        console.error("Error returning reference from Firebase once function");
      });

    } else {
      console.error("Session app ID does not match skill app ID.")
    }
  },
  "Unhandled": function () {
      this.response.speak('OK have a great day');
      this.emit(":responseReady");
  },
});

const updateCOFHandler = Alexa.CreateStateHandler(states.UPDATE_COF, {
  "AMAZON.YesIntent": function () {
    console.log("Hit updateCOFHandler:Yes function");
    var speech = "OK, done.";
    let content = {
      "hasDisplaySpeechOutput": speech,
      "hasDisplayRepromptText": speech,
      "simpleCardTitle": "Card on file information updated",
      "simpleCardContent": `Your recurring payments are safe! We sent your new card number to your favorite companies.`,
      "backgroundImageUrl": "https://s3.amazonaws.com/meganlaux.moviereminder/1.png",
      "templateToken": "FullScreenImage",
      "askOrTell": ":tell",
      "sessionAttributes": this.attributes
    };
    renderTemplate.call(this, content);
  }
});

exports.handler = (event, context) => {
  const alexa = Alexa.handler(event, context);
  alexa.appId = APP_ID;
  alexa.registerHandlers(rootHandler, addMovieHandler, listMoviesHandler, updateCOFHandler);
  alexa.execute();
};

//==============================================================================
//===================== Echo Show Helper Functions  ============================
//==============================================================================

function delegateSlotCollection(){
  console.log("in delegateSlotCollection");
  console.log("current dialogState: "+this.event.request.dialogState);
    if (this.event.request.dialogState === "STARTED") {
      console.log("in Beginning");
      var updatedIntent=this.event.request.intent;
      //optionally pre-fill slots: update the intent object with slot values for which
      //you have defaults, then return Dialog.Delegate with this updated intent
      // in the updatedIntent property
      this.emit(":delegate", updatedIntent);
    } else {
      console.log("in not completed");
      // return a Dialog.Delegate directive with no updatedIntent property.
      this.emit(":delegate");
    }
}

function supportsDisplay() {
  var hasDisplay =
    this.event.context &&
    this.event.context.System &&
    this.event.context.System.device &&
    this.event.context.System.device.supportedInterfaces &&
    this.event.context.System.device.supportedInterfaces.Display

  return hasDisplay;
}

function isSimulator() {
  var isSimulator = !this.event.context; //simulator doesn't send context
  return false;
}

function renderTemplate(content) {
  //learn about the various templates
  //https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/display-interface-reference#display-template-reference
  switch (content.templateToken) {
    case "FullScreenImage":
    console.log("RenderTemplate > FullScreenImage");
      this.handler.response = getFullScreenImageResponse(content);
      break;
    case "ItemDetailsView":
      this.handler.response = getItemDetailsViewResponse(content);
      break;
    case "MultipleChoiceListView":
      this.handler.response = getMultipleChoiceListViewResponse(content);
      break;

    case "videoTemplate":
              // for reference, here's an example of the content object you'd
              // pass in for this template.
              //  var content = {
              //     "hasDisplaySpeechOutput" : "display "+speechOutput,
              //     "hasDisplayRepromptText" : randomFact,
              //     "simpleCardTitle" : this.t('SKILL_NAME'),
              //     "simpleCardContent" : randomFact,
              //     "bodyTemplateTitle" : this.t('GET_FACT_MESSAGE'),
              //     "bodyTemplateContent" : randomFact,
              //     "templateToken" : "factBodyTemplate",
              //     "sessionAttributes": {}
              //  };
              console.log("videoTemplate render");
              var response = {
                "version": "1.0",
                "sessionAttributes": null,
                "response": {
                "outputSpeech": {
                     "type": "SSML",
                     "ssml": "<speak>"+content.hasDisplaySpeechOutput+"</speak>"
                   },
                    "card": null,
                    "directives": [
                    {
                        "type": "VideoApp.Launch",
                        "videoItem":
                        {
                            "source": content.imageURL,
                            "metadata": {
                                "title": "",
                                "subtitle": ""
                            }
                        }
                    }
                    ],
                    "reprompt": null
                    }
                }
               this.context.succeed(response);
               console.log("videoTemplate render", response);

               break;



      default:
        this.response.speak("Nice chatting with you, goodbye");
  }
  this.emit(':responseReady');
}

function getFullScreenImageResponse(content) {
  var response = {
    "version": "1.0",
    "response": {
      "directives": [
        {
          "type": "Display.RenderTemplate",
          "template": {
            "type": "BodyTemplate1",
            "token": "fullscreenimage",
            "backButton": "HIDDEN",
            "backgroundImage": {
              "sources": [
                {
                  "url": content.backgroundImageUrl
                }
              ]
            }
          }
        }
      ],
      "outputSpeech": {
        "type": "SSML",
        "ssml": "<speak>" + content.hasDisplaySpeechOutput + "</speak>"
      },
      "reprompt": {
        "outputSpeech": {
          "type": "SSML",
          "ssml": "<speak>" + content.hasDisplayRepromptText + "</speak>"
        }
      },
      "shouldEndSession": getShouldEndSession(content),
      "card": {
        "type": "Simple",
        "title": content.simpleCardTitle,
        "content": content.simpleCardContent
      }
    },
    "sessionAttributes": content.sessionAttributes
  }
  return response;
}

function getItemDetailsViewResponse(content) {
  var response = {
    "version": "1.0",
    "response": {
      "directives": [
        {
          "type": "Display.RenderTemplate",
          "template": {
            "type": "ListTemplate2",
            "title": content.bodyTemplateTitle,
            "token": content.templateToken,
            "listItems": [
              {
                "token": "restaurant",
                "image": {
                  "sources": [
                    {
                      "url": content.imageUrl1,
                      "widthPixels": 372,
                      "heightPixels": 280
                    }
                  ]
                },
                "textContent": {
                  "primaryText": {
                    "type": "RichText",
                    "text": "<font size = '5'>" + content.bodyTemplateContentPrimary1 + "</font>"
                  },
                  "secondaryText": {
                    "type": "RichText",
                    "text": "<font size = '3'>" + content.bodyTemplateContentSecondary1 + "</font>"
                  }
                }
              }//,
              // {
              //   "token": "restaurant",
              //   "image": {
              //     "sources": [
              //       {
              //         "url": content.imageUrl2,
              //         "widthPixels": 372,
              //         "heightPixels": 280
              //       }
              //     ]
              //   },
              //   "textContent": {
              //     "primaryText": {
              //       "type": "RichText",
              //       "text": "<font size = '5'>" + content.bodyTemplateContentPrimary2 + "</font>"
              //     },
              //     "secondaryText": {
              //       "type": "RichText",
              //       "text": "<font size = '3'>" + content.bodyTemplateContentSecondary2 + "</font>"
              //     }
              //   }
              // },
            ],
            "backButton": "HIDDEN"
          }
        }
      ],
      "outputSpeech": {
        "type": "SSML",
        "ssml": "<speak>" + content.hasDisplaySpeechOutput + "</speak>"
      },
      "reprompt": {
        "outputSpeech": {
          "type": "SSML",
          "ssml": "<speak>" + content.hasDisplayRepromptText + "</speak>"
        }
      },
      "shouldEndSession": getShouldEndSession(content),
      "card": {
        "type": "Simple",
        "title": content.simpleCardTitle,
        "content": content.simpleCardContent
      }
    },
    "sessionAttributes": content.sessionAttributes
  }

  //Send the response to Alexa
  console.log("ready to respond (ItemDetailsView): " + JSON.stringify(response));
  return response;
}

function getMultipleChoiceListViewResponse(content) {
  console.log("listItems " + JSON.stringify(content.listItems));
  var response = {
    "version": "1.0",
    "response": {
      "directives": [
        {
          "type": "Display.RenderTemplate",
          "template": {
            "type": "ListTemplate1",
            "title": content.listTemplateTitle,
            "token": content.templateToken,
            "listItems": content.listItems,
            // "backgroundImage": {
            //   "sources": [
            //     {
            //       "size": "SMALL",
            //       "url": content.backgroundImageSmallUrl
            //     },
            //     {
            //       "size": "LARGE",
            //       "url": content.backgroundImageLargeUrl
            //     }
            //   ]
            // },
            "backButton": "HIDDEN"
          }
        }
      ],
      "outputSpeech": {
        "type": "SSML",
        "ssml": "<speak>" + content.hasDisplaySpeechOutput + "</speak>"
      },
      "reprompt": {
        "outputSpeech": {
          "type": "SSML",
          "ssml": "<speak>" + content.hasDisplayRepromptText + "</speak>"
        }
      },
      "shouldEndSession": getShouldEndSession(content),
      "card": {
        "type": "Simple",
        "title": content.simpleCardTitle,
        "content": content.simpleCardContent
      }
    },
    "sessionAttributes": content.sessionAttributes

  }

  if (content.backgroundImageLargeUrl) {
    //when we have images, create a sources object
    //TODO switch template to one without picture?
    let sources = [
      {
        "size": "SMALL",
        "url": content.backgroundImageLargeUrl
      },
      {
        "size": "LARGE",
        "url": content.backgroundImageLargeUrl
      }
    ];
    //add the image sources object to the response
    response["response"]["directives"][0]["template"]["backgroundImage"] = {};
    response["response"]["directives"][0]["template"]["backgroundImage"]["sources"] = sources;
  }
  console.log("ready to respond (MultipleChoiceList): " + JSON.stringify(response));
  // this.context.succeed(response);
  return response;
}

function getShouldEndSession(content) {
  return content.askOrTell == ":tell";
}
