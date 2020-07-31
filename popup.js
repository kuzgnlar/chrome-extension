'use strict';

let qa_full_site_checkbox = document.getElementById("qa_full_site_checkbox");
var qa_context_textarea = document.getElementById("qa_context_textarea");

qa_full_site_checkbox.onclick = function(element) {
    qa_context_textarea.disabled = qa_full_site_checkbox.checked;
};

let qa_answer_button = document.getElementById('qa_answer_button');

qa_answer_button.onclick = async function(element) {

    var context = "";

    if (qa_full_site_checkbox.checked)  // Use active tab's p tags as context
    {
        function workOnActiveTab() {  // This function send to active tab and executed
            console.log("Active tab side");

            var p_tags = document.body.getElementsByTagName('p');
            var text = "";
            for (let index = 0; index < p_tags.length; index++) {
                text += p_tags[index].innerText;
            }
            console.log(text);
            return text;  // Return tag's text from active tab to extension popup pane
        }

        //We have permission to access the activeTab, so we can call chrome.tabs.executeScript:
        chrome.tabs.executeScript({
            code: '(' + workOnActiveTab + ')();' //argument here is a string but function.toString() returns function's code
        }, (results) => {
            console.log("Extension popup side");
            
            context = results[0];
        });
    }
    else  // Use context text are as context
    {
        context = document.getElementById('qa_context_textarea').value;
    }

    await new Promise(r => setTimeout(r, 2000)); // Wait 2 second because the code below not wait the result of executeScript

    let question = document.getElementById('qa_question_textarea').value;
    let output_textarea = document.getElementById('qa_output_textarea');
    let data = {"context": context, "question": question}

    fetch("http://127.0.0.1:5000/qa", {
        method: "POST", 
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
    }).then(response => {
        if (response.ok) {
            response.json().then(json => {
                output_textarea.innerHTML = json['answer']
            })
        }
    });
};

let ner_entity_button = document.getElementById('ner_entity_button');

ner_entity_button.onclick = function(element) {

    let context = document.getElementById('ner_context_textarea').value;
    let output_textarea = document.getElementById('ner_output_textarea');
    var data = {"context": context}

    fetch("http://127.0.0.1:5000/ner", {
        method: "POST", 
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
    }).then(response => {
        if (response.ok) {
            response.json().then(json => {
                let result = [];
                json.forEach(e => {
                    var string = e['word'] + '(' + e['entity_group'] +')';
                    result.push(string);
                });
                output_textarea.innerHTML = result
            })
        }
    });
};

// We use async await to work syncronus
// So we will work with one p tag at time
// If we use same as above for send reuqest
// For loop fetch works at the same time and send requests at same time
// So flask try to handle multi requests and my computer crashes because of out of mem

let ner_full_site_button = document.getElementById('ner_full_site_button');

ner_full_site_button.onclick = function(element) {

    async function workOnActiveTab() {  // This function send to active tab and executed

        var p_tags = document.body.getElementsByTagName('p');  //Fetch all P tags on body
        for (let index = 0; index < p_tags.length; index++) {

            var text_pure = p_tags[index].innerText;  // To give ner as context
            var text_html = p_tags[index].innerHTML;  // To add style ner words to make them fancy
            var data = {"context": text_pure}

            var response = await fetch("http://127.0.0.1:5000/ner", {
                method: "POST", 
                body: JSON.stringify(data),
                headers: {
                  'Content-Type': 'application/json; charset=utf-8'
                },
            })
            
            var entities = await response.json();  // Wait second response after cors

            // str replace all
            function escapeRegExp(string) {
                return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
            }
            function replaceAll(str, find, replace) {
            return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
            }

            entities.forEach(e => {
                var word = e['word'];
                //word = word.replace('##', '');  // Delete dashes if there are
                
                var entity = e['entity_group'];
                text_html = replaceAll(text_html, word+' ', "<span style='color:white;background-color:black;'>"+word+'('+entity+')'+"</span> ");
                p_tags[index].innerHTML = text_html;
            });
        }
        console.log("Active tab side");
        return "Success";  // Return success from active tab to extension popup pane
    }

    //We have permission to access the activeTab, so we can call chrome.tabs.executeScript:
    chrome.tabs.executeScript({
        code: '(' + workOnActiveTab + ')();' //argument here is a string but function.toString() returns function's code
    }, (results) => {

        console.log("Extension popup side");
        console.log(results);
    });

};