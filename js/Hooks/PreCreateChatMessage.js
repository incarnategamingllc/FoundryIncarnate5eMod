Hooks.on("preCreateChatMessage", (messageInformation, renderingSheet) =>{
    console.log("triggered preChreateChatMessage",messageInformation, renderingSheet);
    let chatMessage = messageInformation.content;
    if (chatMessage === undefined)return;
    if (chatMessage.match(/^\?help/) !== null){
        messageInformation.content += `<div><strong>Public Commands:</strong> ?statRoll ?statAuditMe ?statAudit ?parseActor ?pA ?parseJournal ?pJ ?parseItem ?pI</div><div><strong>GM Commands:</strong> ?gmscreen</div><div>See ${IncarnateGamingLLC.PLAYER_QUICK_SHEET} for more details</div>`;
        return true;
    }
    //Creating Cross Reference links in chat and console
    else if (chatMessage.match(/^\?parse/) !== null){
        if (chatMessage.match(/^\?parseActor/i) !== null){
            const tempMessage = IncarnateFiveEMessages.crossReferenceParseActor(chatMessage.substr(12));
            if (tempMessage === false){
                return false;
            }
            messageInformation.content = tempMessage;
            console.log(tempMessage)
        } else if (chatMessage.match(/^\?parseJournal/i) !== null){
            const tempMessage = IncarnateFiveEMessages.crossReferenceParseJournal(chatMessage.substr(14));
            if (tempMessage === false){
                return false;
            }
            messageInformation.content = tempMessage;
            console.log(tempMessage)
        } else if (chatMessage.match(/^\?parseItem/i) !== null){
            const tempMessage = IncarnateFiveEMessages.crossReferenceParseItem(chatMessage.substr(11));
            if (tempMessage === false){
                return false;
            }
            messageInformation.content = tempMessage;
            console.log(chatMessage);
        }
    }else if (chatMessage.match(/^\?p/) !== null){
        if (chatMessage.match(/^\?pA/)){
            const tempMessage = IncarnateFiveEMessages.crossReferenceParseActor(chatMessage.substr(4));
            if (tempMessage === false){
                return false;
            }
            messageInformation.content = tempMessage;
            console.log(chatMessage);
        }else if (chatMessage.match(/^\?pI/)){
            const tempMessage = IncarnateFiveEMessages.crossReferenceParseItem(chatMessage.substr(4));
            if (tempMessage === false){
                return false;
            }
            messageInformation.content = tempMessage;
            console.log(chatMessage);
        }else if (chatMessage.match(/^\?pJ/)){
            const tempMessage = IncarnateFiveEMessages.crossReferenceParseJournal(chatMessage.substr(4));
            if (tempMessage === false){
                return false;
            }
            messageInformation.content = tempMessage;
            console.log(chatMessage);
        }
    }
    if (!game.user.isGM)return;
});
