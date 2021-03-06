/*	Author: Michael Preston
 *	Created Date: "11-01-2018"
 */

var config = {
    apiKey: "AIzaSyBwKvd8TvlyhUUS-yU9knzCrgRnZa16wQE",
    authDomain: "rps-multiplayer-hwk7.firebaseapp.com",
    databaseURL: "https://rps-multiplayer-hwk7.firebaseio.com",
    projectId: "rps-multiplayer-hwk7",
    storageBucket: "",
    messagingSenderId: "901030525478"
};

firebase.initializeApp(config);

var db = firebase.database();

//References:
var clients = db.ref(".info/connected"),
    roomsRef = db.ref("rooms"),
    connectionsRef = db.ref("/connections"),
    clientConnectionRef = db.ref(".info/connected"),
    chatRef = db.ref("chat");

var player = {};
var opponent = {};
var playerRoom = {}

var playerCount = 0;
const ipRegex = /\./g;

playerRoom.name = "tinytiger1" //createName() + random(range(1, 9));

window.onload = init;

var opponentWins, playerWins;
var opponentChoice;

// 1. Finish the remove user from room.
// 2. Determine winner.
// 3. Random Usernames
// 4. prevent username collision
// 5. 

function init() {

    var clientIP;

    //Send chat message:
    $('#send').on('click', function (event) {
        event.preventDefault();
        send();
    });

    getMyIP().then(result => {

            clientIP = result;

            // console.log('client ip: ', clientIP);

            let playerName = sessionStorage.getItem("name") || createName();
            sessionStorage.setItem('name', playerName)
            // console.log('ls: ', sessionStorage);

            player = {
                name: playerName,
                ip: clientIP,
                Choice: null,
            }

            // clearAllRooms(); //todo: remove before prod
            // clearChat(); //todo: remove before prod

            addPlayerToRoom(player, playerRoom.name);            
            // addCPUToRoom(roomName);

        }).then(_ => {
            // track connected user:
            clients.on("value", snapshot => {

                if (snapshot.val() && clientIP) {
                    //Adding the user's IP address to prevent multiple tabs.

                    let formattedIP = getFormattedIP(clientIP);

                    // console.table([clientIP, formattedIP]);

                    connectionsRef
                        .child(player.name)
                        .push({
                            ip: clientIP,
                            name: player.name
                        });

                    connectionsRef.onDisconnect().remove(
                        error => {
                            if (error) console.log('could not disconnect: ', error);
                        }
                    )
                }
            });
        })
        .then(_ => chatRef.child('posts')
            .orderByKey()
            .on('child_added',
                (chatshot) => {
                    const post = {
                        message,
                        playerIP,
                        playerName,
                    } = chatshot.val();

                    // console.log(">>> ", message)
                    console.table([message, playerIP, playerName])
                    renderMessage(post);

                    //if ips/username of poster does not match yours ,then mark with opponent's name.

                }))
        // .then(_ =>
        //     chatRef.on("child_added", snapshot => {
        //         console.log('chatshot:', snapshot.val());
        //         let posts = snapshot.child('posts').val();
        //         console.log('posts:', posts);


        //         posts.foreach(post => {
        //             console.log('Post: ', post);
        //         });

        //     }))
        .then(_ => {
            connectionsRef.on("value", snapshot => $("#watchers").text(snapshot.numChildren()))
        })
        .then(_ => roomsRef.child(playerRoom.name).on("value", room => console.log('players: ', room.val())))

        // .then(_ => {
        //     let currentRoom = roomsRef.child(room.name)
        //     console.log('currentroom ref:', currentRoom);

        //     currentRoom.on('value', snapshot => room.playerCount = snapshot.numChildren())
        //     currentRoom.on('child_added', nextPlayer => {

        //         // console.log('next player: ', nextPlayer.val());
        //         //TODO: on NEW child added,
        //         let playerIP = nextPlayer.val();

        //         // console.log({
        //         //     playerIP,
        //         //     numPlayers: room.playerCount,
        //         // });

        //         if (room.playerCount > 1 || playerIP !== player.ip) {
        //             opponent.ip = playerIP;
        //             opponent.name = nextPlayer.val().name;
        //         } else if (room.playerCount == 1) {
        //             // opponent.ip = ?
        //         }
        //     })

        // })
        .then(_ => roomsRef.on("value", snapshot => console.log('rooms snapshot() ', snapshot.val())))
}



$(document).on('click', "button", function () {

    if (player.hasChosen) {
        // $('#player-choice').text(`You already chose ${player.Choice}!`); //Optional
        return;
    }

    var that = this;
    let alt = $(that).attr("alt");

    if (!alt) return;

    player.Choice = alt;

    $('#player-choice').text(`You chose ${player.Choice}`);
    player.hasChosen = true;
    console.log('player: ', player);

    updatePlayer(player);
})

function removePlayer(playerName) {
    roomsRef.child(playerRoom.name)
        .child(playerName)
        .remove();
}

const speak = async (message) => {

    if (!message) return;

    if (message === "dev:clear-chat") {
        clearChat();
        return;
    }

    console.log('message: ', message);

    chatRef.child('posts').push({
        playerIP: player.ip,
        message,
        playerName: player.name,
    });
}

const renderMessage = (post) => {

    let div = $('<div>');
    let label = $('<label>').text(`${post.playerName}:`).appendTo(div); //TODO: fetch the accompanying playerName from Firebase.

    label.css("font-weight", "bold");

    $('<p>').text(post.message).appendTo(div);
    div.appendTo($('#chat-history'))
}

const updatePlayer = (player) => {
    if (!player.Choice) return;

    let currentRoom = roomsRef.child(playerRoom.name);
    let playerRef = currentRoom.child(player.name);
    // console.log(player);
    playerRef.update(player);
}

const addPlayerToRoom = (player, roomName) => {

    //todo: check number of players in room by how many children on the room's key.
    // if 0 or 1 already, add.
    // if 2, find new room.
    // console.log('', roomsRef.child(roomName).val());

    let ref = roomsRef.child(roomName)
    ref.once("value").then(s => console.log("i'm special: ", s.val()))

    roomsRef.child(roomName)
        .push(player);
}

const send = async () => {
    let box = $('#chatbox');
    speak(box.val());
    box.val('');
};

const clearAllRooms = async () => roomsRef.remove();
const clearChat = async () => chatRef.child('posts').remove();
const getMyIP = async () => new Promise(resolve => $.getJSON('https://ipapi.co/json', data => resolve(data.ip)))

const getFormattedIP = ip => ip.replace(ipRegex, '_');

const randomInt = (min, max, inclusive) => Promise.resolve(Math.floor(Math.random() * (max - min + (inclusive ? 1 : 0))) + min);