// Get the textarea element using the query selector
const textarea = document.querySelector('textarea[placeholder="Send a message..."]');

// Function to get the API key from storage
function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('OPENAI_API_KEY', (data) => {
      resolve(data.OPENAI_API_KEY);
    });
  });
}

// Function to create a question element
function createQuestionElement(questionText) {
  const question = document.createElement('p');
  question.innerText = questionText;
  return question;
}

// async function fetchDataFromAPI(inputValue) {
//   return dummy_json
// }
// async function fetchMoreQuestions(inputValue) {
//   return dummy_json
// }
// Function to fetch data from the OpenAI API
async function fetchDataFromAPI(inputValue) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return { "response_ok": false ,"systemMessage" : "no_api_key"};
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {role: "user", content: `You are now my excellent personal assistant. I will give you my prompt. Then:
          Step 1. Provide a more understandable prompt from my original prompt. Do not add details I don't mention. 
          Step 2. Let me know if the new prompt has details that I don't mention in my original prompt, if yes, remove them.
          Step 3. Then provide a JSON response with format:
          {
            "transfer_to": the professional,
            "revised_prompt": text,
            "questions": {
              "1": text,
              ...
            },
            "uncompleted_sentences": {
              "1": text,
              ...
            }
          }
          Explanation:
          a. "transfer_to": The hired professional to whom you will transfer my prompt to.
          b. "revised_prompt": The final prompt.
          c. "questions" : Provide 3 questions from the professional to me to help him understand thoroughly my idea (e.g., What is the abc of xyz?).
          d. "uncompleted_sentences" : Prepare uncompleted sentences for those questions for me to answer them (e.g., "The abc of xyz is [efgh/klmn/...]").
          `},
          {role: "assistant", content: "Certainly, please provide me with your prompt and I will create the JSON response as requested. The revised_prompt will be a precise prompt from your original prompt without details you don't mention."},
          {
            role: "user",
            content: `Original Prompt: "${inputValue}"
            Please keep any details of the original Prompt. The JSON response must be correctly formatted.`,
          },
        ],
        temperature: 0.8,
        max_tokens : 1000
      }),
    });

    if (!response.ok) {
      return {"revised_prompt": "", "response_ok": false,"systemMessage" : "Something wrong with OpenAI API, please try again OR check your API key."};
    }
    
    const data = await response.json();
    
    const fullMessage = data.choices[0].message.content;
    const jsonRegex = /{(?:[^{}]|{[^{}]*})*}/;
    let jsonString = fullMessage.match(jsonRegex)[0];
    jsonString = jsonString.replace(/,\s*([\]}])/g, '$1');
    const parsedJson = JSON.parse(jsonString);
    parsedJson.response_ok = true;
    parsedJson.systemMessage = "";
    return parsedJson;
  } catch (error) {
    console.log(error);
    return {"revised_prompt": "", "response_ok": false,"systemMessage" : "Something wrong. Please try again."};
  }
}

async function fetchMoreQuestions(inputValue) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    displayOpenAiApiKeyForm(messageBox)
    setupApiKeyForm() 
    return { "response_ok": false ,"systemMessage" : "no_api_key"};
  }


  try {
    const { revised_prompt, transfer_to, ...inputValue_2 } = inputValue;
    const msg = `You are the ${transfer_to} AI that I hired to help me solve my problem: "${revised_prompt}". 
    You have to prepare a message to ask me for more details:
    ${JSON.stringify(inputValue_2)}
    Now write a new JSON with 3 different questions and uncompleted sentences for me to answer.
    Please follow the above schema.`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {role: "user", content: msg},
        ],
        temperature: 0.8,
        max_tokens : 2000
      }),
    });    

    if (!response.ok) { return { "response_ok": response.ok,"systemMessage" : "Something wrong with OpenAI API, please try again OR check your API key."} }
    else {    
      const data = await response.json();
      const fullMessage = data.choices[0].message.content;
      // Extract the JSON object from the full message
      const jsonRegex = /{(?:[^{}]|{[^{}]*})*}/;
      var jsonString = fullMessage.match(jsonRegex)[0];
      jsonString = jsonString.replace(/,\s*([\]}])/g, '$1');
      const parsedJson = JSON.parse(jsonString);
      // console.log(parsedJson)
      parsedJson.response_ok = true;
      parsedJson.systemMessage = ""
      return parsedJson;
    }
  } catch (error) {
    console.log(error);
    return { "response_ok": false ,"systemMessage" : "Something wrong. Please try again."};
  }
}

let questionElements = [];
let answerInputsList = [];
const revisedPromptElement = document.createElement('p');
const questionContent = document.createElement('div');
const messageBox = document.createElement('div');
let modifiedAnswersList = [];

async function listenForTabEvent(textarea) {
  try {
        questionElements = [];
        answerInputsList = [];
        modifiedAnswersList = [];
        questionContent.innerHTML = "";
        messageBox.innerHTML = "";
        // Get the input value from the textarea
        const inputValue = textarea.value.trim();
        console.log(inputValue)

        // Create the message box element
        
        messageBox.style.position = 'fixed';
        messageBox.style.top = '0';
        messageBox.style.left = '0';
        messageBox.style.width = '100%';
        messageBox.style.height = '100%';
        messageBox.style.background = 'rgba(0, 0, 0, 0.5)';
        messageBox.style.display = 'flex';
        messageBox.style.justifyContent = 'center';
        messageBox.style.alignItems = 'center';
        messageBox.style.zIndex = '9999';
        
        document.body.appendChild(messageBox);
        
        // Create the message box content element
        const messageBoxContent = document.createElement('div');
        messageBoxContent.id = "messageBoxContent"
        messageBoxContent.style.background = '#fff';
        messageBoxContent.style.borderRadius = '10px';
        messageBoxContent.style.padding = '20px';
        messageBoxContent.style.boxShadow = '0px 0px 10px 0px rgba(0,0,0,0.5)';
        messageBoxContent.style.position = 'relative';
        messageBoxContent.style.minWidth = '300px';
        messageBoxContent.style.overflow = 'auto';
        messageBoxContent.style.background = '#fff';
        messageBoxContent.style.borderRadius = '10px';

        // Add these lines to make the messageBoxContent scrollable
        messageBoxContent.style.maxHeight = '80%'; // Set the max height for the message box content
        messageBoxContent.style.overflowY = 'scroll'; // Enable vertical scrolling
        messageBoxContent.style.paddingRight = '30px'; // Add padding to the right to accommodate the scrollbar

        messageBox.appendChild(messageBoxContent);
        
        // Create the close button
        const closeButton = document.createElement('button');
        closeButton.innerText = '[X]';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '1em';
        closeButton.style.cursor = 'pointer';
        messageBoxContent.appendChild(closeButton);
        
        // Listen for clicks on the close button
        closeButton.addEventListener('click', function() {
          // Remove the message box
          document.body.removeChild(messageBox);
        });
        
        // Create the message box title
        const title = document.createElement('h2');
        title.style.marginTop = '0';
        title.style.marginBottom = '10px';
        title.style.fontSize = '1em';
        title.style.textAlign = 'left';
        // title.innerText = 'Wait a moment...';
        const imageUrl = chrome.runtime.getURL('icon.gif');
        // Set the inner HTML of the message box content element to an image element pointing to the GIF file
        title.innerHTML = `
        <div style="display: flex; align-items: center;">
          <img src="${imageUrl}" alt="Loading..." style="height: 1.5em;">
        </div>
        `;

        messageBoxContent.appendChild(title);
        
        const revisedPromptBox = document.createElement('div');
        revisedPromptBox.style.border = '1px solid #ccc';
        revisedPromptBox.style.borderRadius = '5px';
        revisedPromptBox.style.padding = '10px';
        revisedPromptBox.style.marginBottom = '10px';
        revisedPromptBox.style.backgroundColor = '#DFF0D8'; // Set background color to green shade
        revisedPromptBox.style.display = 'flex';
        revisedPromptBox.style.alignItems = 'center'; // Center the tick icon vertically
        revisedPromptBox.style.justifyContent = 'flex-start'; // Place the tick icon at the beginning
        revisedPromptBox.innerHTML = '<i class="fa fa-check" style="color: green; margin-right: 5px;"></i>'; // Add tick icon
        


        // Fetch data from the OpenAI API
        const data = await fetchDataFromAPI(inputValue);
        if (!data.revised_prompt){
          if(!data.response_ok) {
            title.innerText = data.systemMessage;
            if (data.systemMessage == "no_api_key") {
              title.innerText = "Please update your OpenAI API key:"
              input_api_form()
            }
          }
          else {
            title.innerText = 'Something wrong, please try again...';
          }
        }
        else {
          data.revised_prompt = reviseParagraphPunctuation(data.revised_prompt)
          const uncompleted_sentences = data.uncompleted_sentences;
          const questions = data.questions;
          const revisedPrompt = data.revised_prompt;


          // Create a revised prompt element and add it to the beginning of the message box
          title.innerText = 'Revised prompt:';
          revisedPromptElement.innerText =`${revisedPrompt}`;
          revisedPromptBox.appendChild(revisedPromptElement);
          messageBoxContent.insertBefore(revisedPromptBox, title.nextSibling);

          // Create new questions and input fields based on the API response
          // const instructionElement = document.createElement('p');
          const instructionElement = document.createElement('h2');
          instructionElement.style.marginTop = '0';
          instructionElement.style.marginBottom = '10px';
          instructionElement.style.fontSize = '1em';
          instructionElement.style.textAlign = 'left';
          if (questions) {
            instructionElement.innerText =`Answer the questions below to improve the prompt (or ignore if irrelevant), and then press [Submit] to apply the new prompt:`;
            addQuestionsAndInputs(data,questions, uncompleted_sentences);
            // messageBoxContent.appendChild(questionContent);
            messageBoxContent.insertBefore(questionContent, title);
            messageBoxContent.insertBefore(instructionElement, questionContent);
            
          }
          
          // Add some margin between each child element of messageBoxContent
          messageBoxContent.childNodes.forEach((child) => {
            child.style.marginBottom = '10px';
          });
          
          // Create the submit button
          const submitButton = document.createElement('button');
          submitButton.innerText = 'Submit';
          submitButton.style.marginTop = '10px';
          submitButton.style.background = '#4CAF50';
          submitButton.style.color = '#fff';
          submitButton.style.borderRadius = '5px';
          submitButton.style.border = 'none';
          submitButton.style.padding = '10px';
          submitButton.style.cursor = 'pointer';
          submitButton.style.display = 'block'; // Set display to block
          submitButton.style.marginLeft = 'auto'; // Move the button to the right align
          submitButton.style.marginBottom = '15px';


          // Add the submit button to the message box
          messageBoxContent.insertBefore(submitButton, revisedPromptBox.nextSibling);
          
          // Create the line div
          const lineDiv = document.createElement('div');
          lineDiv.style.width = '100%';
          lineDiv.style.height = '1px';
          lineDiv.style.background = '#ccc';
          lineDiv.style.marginTop = '10px';
          lineDiv.style.marginBottom = '15px';

          // Add the submit button and line div to the message box
          messageBoxContent.insertBefore(lineDiv, submitButton.nextSibling);
          // Listen for clicks on the submit button
          submitButton.addEventListener('click', function() {
            // Get the values from the input fields and concatenate them into a single string
            textarea.value = revisedPromptElement.innerText;

            // Remove the message box
            document.body.removeChild(messageBox);
          });
          const generateMoreButton = document.createElement('button');
          generateMoreButton.innerText = 'Generate more questions';
          generateMoreButton.style.marginTop = '10px';
          generateMoreButton.style.background = '#008CBA';
          generateMoreButton.style.color = '#fff';
          generateMoreButton.style.borderRadius = '5px';
          generateMoreButton.style.fontSize = '1em';
          generateMoreButton.style.border = 'none';
          generateMoreButton.style.padding = '10px';
          generateMoreButton.style.cursor = 'pointer';
          generateMoreButton.style.display = 'block'; // Set display to block

          // Add the generate more questions button to the message box
          // messageBoxContent.appendChild(generateMoreButton); // Add this line to display the generate more questions button
          messageBoxContent.insertBefore(generateMoreButton, title);
          // Create the line div
          // const lineDiv = document.createElement('div');
          // lineDiv.style.width = '100%';
          // lineDiv.style.height = '1px';
          // lineDiv.style.background = '#ccc';
          // lineDiv.style.marginTop = '10px';
          // lineDiv.style.marginBottom = '15px';

          // Add the submit button and line div to the message box
          messageBoxContent.insertBefore(lineDiv, generateMoreButton.nextSibling);
          // Listen for clicks on the generate more questions button
          generateMoreButton.addEventListener('click', async function() {
            try {
              generateMoreButton.innerHTML = `
                <div style="display: flex; align-items: center;">
                  <img src="${imageUrl}" alt="Loading..." style="height: 1.5em;">
                </div>
              `;
              // Disable the generate more questions button during fetching
              generateMoreButton.disabled = true;
              // Wrap the entire async function inside a Promise and use await to make sure the button is disabled
              await new Promise(resolve => setTimeout(resolve, 1));

              // Fetch more data from the OpenAI API
              const moreData = await fetchMoreQuestions(data);
              
              // Add the new questions and revised prompt to the message box content
              const moreQuestions = moreData.questions;
              const moreUncompletedSentences = moreData.uncompleted_sentences;
              
              // Add the new questions and input fields
              if(!moreData.response_ok) {title.innerText = moreData.systemMessage;}
                else if (moreQuestions) {
                addQuestionsAndInputs(data,moreQuestions, moreUncompletedSentences);
                combineData(data,moreData)
              }
              // Add some margin between each child element of messageBoxContent
              messageBoxContent.childNodes.forEach((child) => {
                child.style.marginBottom = '10px';
              });

            } catch (error) {
              console.error("An error occurred when loading more questions: ", error);
              alert("An error occurred when loading more questions")
            } finally {
            generateMoreButton.innerText = 'Generate more questions';
            generateMoreButton.disabled = false;
            }
          });
          messageBoxContent.childNodes.forEach((child) => {
            messageBoxContent.style.marginBottom = '10px';
          });
      }
  } catch (error) {
    console.error("An error occurred:", error);
    alert("An error occurred.")
  }
}  
function updateRevisedPrompt(modifiedIndex,data) {
  const modifiedAnswer = answerInputsList[modifiedIndex].value.trim();

  if (modifiedAnswer) {
    modifiedAnswersList[modifiedIndex] = `${modifiedAnswer}. `;
  } else {
    modifiedAnswersList[modifiedIndex] = "";
  }

  revisedPromptElement.innerText = reviseParagraphPunctuation(`${data.revised_prompt} ${modifiedAnswersList.join("")}`);
}

function addQuestionsAndInputs(data,newQuestions, newUncompletedSentences) {
  Object.keys(newQuestions).forEach((key, index) => {
    const questionText = newQuestions[key];
    const questionElement = createQuestionElement(questionText);
    const answerInput = document.createElement('input');
    answerInput.style.borderRadius = '5px';
    answerInput.type = 'text';
    answerInput.value = newUncompletedSentences[key];
    answerInput.size = newUncompletedSentences[key].length;

    const newIndex = questionElements.length;
    questionElements.push(newUncompletedSentences[key]);
    answerInputsList.push(answerInput);
    modifiedAnswersList.push(""); // Initialize the modified answer with an empty string

    // Add event listener to answerInput elements
    answerInput.addEventListener('input', function() {
      updateRevisedPrompt(newIndex,data);
    });

    questionContent.appendChild(questionElement);
    questionContent.appendChild(answerInput);
    questionContent.childNodes.forEach((child) => {
      child.style.marginBottom = '10px';
    });
  });
}


function init() {
  document.body.addEventListener('keydown', (event) => {
    const target = event.target;
    if (
      target.tagName === 'TEXTAREA' &&
      target.getAttribute('placeholder') === 'Send a message...' &&
      event.key === 'Tab'
    ) {
      event.preventDefault();
      if (!processedTextareas.has(target)) {
        processedTextareas.add(target);
      }
      listenForTabEvent(target);
    }
  });
}

function combineData(json1, json2) {
  // Get the last question number from the existing questions object
  let lastQuestionNumber = Object.keys(json1.questions).length;

  // Get the last uncompleted sentence number from the existing uncompleted sentences object
  let lastUncompletedSentenceNumber = Object.keys(json1.uncompleted_sentences).length;

  // Loop through the questions in json2 and add them to json1 with new numbering
  for (let [questionNumber, questionText] of Object.entries(json2.questions)) {
    lastQuestionNumber++;
    json1.questions[lastQuestionNumber] = questionText;
  }

  // Loop through the uncompleted sentences in json2 and add them to json1 with new numbering
  for (let [sentenceNumber, sentenceText] of Object.entries(json2.uncompleted_sentences)) {
    lastUncompletedSentenceNumber++;
    json1.uncompleted_sentences[lastUncompletedSentenceNumber] = sentenceText;
  }

  return json1;
}


function reviseParagraphPunctuation(paragraph) {
  // Split paragraph into sentences
  const sentences = paragraph.match(/[^\.!\?]+[\.!\?]+/g);

  // Check if sentences is null, return paragraph with added period if needed
  if (!sentences) {
    if (!/\.$/.test(paragraph)) {
      paragraph += ".";
    }
    return paragraph;
  }

  // Check for surplus periods and remove them, except for the last sentence's period
  const revisedSentences = sentences.map((sentence, index) => {
    if (index < sentences.length - 1) {
      return sentence.replace(/\.{2,}/g, '.');
    }
    return sentence;
  });

  // Join revised sentences back into a paragraph
  let revisedParagraph = revisedSentences.join(' ');

  // Check if revised paragraph ends with a period
  if (!/\.$/.test(revisedParagraph)) {
    // If not, add a period to the end
    revisedParagraph += ".";
  }

  return revisedParagraph;
}

function formAPIkey() {
  const form = document.createElement('api-key-form');
  const apiKeyInput = document.createElement('api-key');
  const saveBtn = document.createElement('save-button');
  // Function to hide the API key
  function hideApiKey(apiKey) {
    if (apiKey.length <= 6) {
      return '*'.repeat(apiKey.length);
    }
    const firstPart = apiKey.substr(0, 3);
    const lastPart = apiKey.substr(-3);
    const hiddenPart = '*'.repeat(apiKey.length - 6);
    return firstPart + "***" + lastPart;
  }

  // Load the stored API key
  chrome.storage.sync.get('OPENAI_API_KEY', (data) => {
    if (data.OPENAI_API_KEY) {
      apiKeyInput.value = hideApiKey(data.OPENAI_API_KEY);
    }
  });

  // Save the API key when the form is submitted
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    chrome.storage.sync.set({ OPENAI_API_KEY: apiKeyInput.value.trim() }, () => {
      if (apiKeyInput.value) {
        saveBtn.innerText = "API key saved"
        location.reload();
      } else {saveBtn.innerText = "Saved"}
      apiKeyInput.value = hideApiKey(apiKeyInput.value.trim());
    });
  });
}

var dummy_json = {
  "transfer_to": "the professional",
  "revised_prompt": "In today's fast-paced world, it's becoming increasingly difficult to keep up with the ever-changing trends and advancements. As a result, people are constantly looking for ways to stay on top of things and remain competitive in their fields. This is where professional help comes in, and that's why we're here to offer our services.",
  "questions": {
    "1": "What inspired you to pursue this field?",
    "2": "How do you stay up-to-date with the latest developments in your industry?",
    "3": "What are some common misconceptions about your profession?"
  },
  "uncompleted_sentences": {
    "1": "One thing I've learned throughout my career is that",
    "2": "When it comes to solving complex problems,",
    "3": "In order to be successful in this field, it's important to"
  }
}
function input_api_form() {
  const messageBox = document.getElementById('messageBoxContent');

  // Create label element
  const label = document.createElement('label');
  label.textContent = 'API Key:';
  label.style.marginRight = '10px';

  // Create input element
  const input = document.createElement('input');
  input.id = 'api-key';
  input.style.marginRight = '10px';
  input.style.width = '200px';
  input.style.backgroundColor = 'grey';
  input.style.border = '1px solid black';

  // Create button element
  const button = document.createElement('button');
  button.textContent = 'Save';
  button.id = 'save-button';
  button.style.backgroundColor = '#4CAF50';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.padding = '10px 20px';
  button.style.borderRadius = '4px';

  // Append elements to messageBox
  messageBox.appendChild(label);
  messageBox.appendChild(input);
  messageBox.appendChild(button);

  const apiKeyInput = document.getElementById('api-key');
  const saveBtn = document.getElementById('save-button');

  // Load the stored API key
  chrome.storage.sync.get('OPENAI_API_KEY', (data) => {
    if (data.OPENAI_API_KEY) {
      apiKeyInput.value = hideApiKey(data.OPENAI_API_KEY);
    }
  });

  // Save the API key when the form is submitted
  messageBox.addEventListener('submit', (e) => {
    e.preventDefault();
    saveApiKey(apiKeyInput.value.trim(), saveBtn, apiKeyInput);
  });

  // Add event listener for the click event on the save button
  saveBtn.addEventListener('click', () => {
    saveApiKey(apiKeyInput.value.trim(), saveBtn, apiKeyInput);
  });
}

// Function to hide the API key
function hideApiKey(apiKey) {
  if (apiKey.length <= 6) {
    return '*'.repeat(apiKey.length);
  }
  const firstPart = apiKey.substr(0, 3);
  const lastPart = apiKey.substr(-3);
  return firstPart + "***" + lastPart;
}

// Function to save the API key
function saveApiKey(apiKey, saveBtn, apiKeyInput) {
  chrome.storage.sync.set({ OPENAI_API_KEY: apiKey }, () => {
    if (apiKey) {
      saveBtn.innerText = "API key saved";
      // location.reload();
    }
    else {
      saveBtn.innerText = "Saved";
      // location.reload();
    }
    apiKeyInput.value = hideApiKey(apiKey);
  });
}

function addOpenAiApiKeyStyles() {
  const styleElement = document.createElement('div');
  styleElement.innerHTML = openAiApiKeyStyles;
  document.head.appendChild(styleElement);
}
const processedTextareas = new Set();

init();
