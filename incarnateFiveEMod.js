//On program start runs our setup function
Hooks.on('ready', async () =>  {
	if (game.settings.get("incarnateWorldBuilding","anvilButtons")){
		var anvil = document.getElementById("logo")
		//makes right clicking anvil show|hide chat
		if ( game.user.isGM ) {
			anvil.addEventListener("contextmenu",incarnatePlayerQuickSheet);
		}else{
			anvil.addEventListener("click",incarnatePlayerQuickSheet);
		}
	}
	IncarnateFiveEModSettings.incarnateSetupDefaults();
	IncarnateRegion.incarnateSetupRegions();
	IncarnateRandomEncounter.incarnateSetupDefaults();
	//sets up helpers for random encounter generator
	Handlebars.registerHelper("incarnateXpBetween", function(minXP, maxXP, xp){
		xp = Number(xp);
		minXP = Number(minXP);
		maxXP = Number(maxXP);
		return (xp*4) < minXP ? "" :
			xp > maxXP ? "" : 
			xp > 0 ? " checked" : "";
	});
	//sets up helpers to assist with browsers
	Handlebars.registerHelper('incarnatePrice',function(price){return Incarnate5eConversions.incarnatePriceConvert(price)});
	Handlebars.registerHelper('incarnateRaceBoost', function(boosts) {
		if (boosts != undefined){
			var result = "";
			const boostLen = boosts.length;
			for (a=0;a<boostLen;a++){
				result += boosts[a].ability + boosts[a].change;
			}
			return result;
		}
		return "";
	});
	Handlebars.registerHelper("incarnateSkillProficiency", function (proficiency){
		if (proficiency === 0) return new Handlebars.SafeString('<a class="skill-proficiency" title="Not Proficient"><i class="far fa-circle"/></a>');
		else if (proficiency === 0.5) return new Handlebars.SafeString('<a class="skill-proficiency" title="Jack of all Trades"><i class="fas fa-adjust"/></a>');
		else if (proficiency === 1) return new Handlebars.SafeString('<a class="skill-proficiency" title="Proficient"><i class="fas fa-check"/></a>');
		else if (proficiency === 2) return new Handlebars.SafeString('<a class="skill-proficiency" title="Expertise"><i class="fas fa-check-double"/></a>');
		else console.warn("Invalid Proficiency: ",proficiency); return "";
	});
	Handlebars.registerHelper("incarnateSaveProficiency", function (proficiency){
		if (proficiency === 0) return new Handlebars.SafeString('<a class="ability-proficiency" title="Not Proficient"><i class="far fa-circle"/></a>');
		else if (proficiency === 1) return new Handlebars.SafeString('<a class="ability-proficiency" title="Proficient"><i class="fas fa-check"/></a>');
		else console.warn("Invalid Proficiency: ",proficiency); return "";
	});
	Handlebars.registerHelper("incarnateLanguage", function (language){
		if (language === undefined) return "";
		if (language.length > 0){
			if (language === "custom") return "";
			return new Handlebars.SafeString('<span class="language">' + language.substr(0,1).toUpperCase() + language.substr(1) + '</span>');
		}else return "";
	});
	Handlebars.registerHelper("incarnateCapitalize", function (string){
		if (string === undefined) return "";
		if (string.length > 0){
			return string.toUpperCase();
		}
	});
	//Adds crossReference support to item summary fold outs on default character sheet.
	const IncarnateOnItemSummary= (function() {
		var cached_function = ActorSheet.prototype._onItemSummary;
		return function(event) {
			var result = cached_function.apply(this, arguments); // use .apply() to call it
			IncarnateReference.crossReferenceSetClick($(event.currentTarget).parents('.item')[0]);
			return result;
		};
	})();
	ActorSheet.prototype._onItemSummary = IncarnateOnItemSummary;
	//Adds draggability to item sheet images
	const IncarnateItemSheetListeners = (function() {
		var cached_function = ItemSheet.prototype.activateListeners;
		return function(html) {
			var result = cached_function.apply(this, arguments);
			const itemDom = $("html")[0].getElementsByClassName("item sheet dnd5e");
			var images=[];
			[].forEach.call(itemDom,element=> images.push(element.getElementsByTagName("img")[0]));
			[].forEach.call(images,element=> element.addEventListener("dragstart",event=>{
				//event.preventDefault();
				this._onDragStart(event);
			}));
			return result;
		};
	})();
	ItemSheet.prototype.activateListeners = IncarnateItemSheetListeners;
	//Makes the combat tracker skip defeated actors
	const IncarnateNextRound = (function () {
		var cached_function = Combat.prototype.nextRound;
		return function(){
			IncarnateCalendar.secondChange(6);
			var result = cached_function.apply(this, arguments);
			return result;
		}
	})();
	Combat.prototype.nextRound = IncarnateNextRound;
	//Makes dropping onto canvas support dropping encounters instead of just single actors
	const IncarnateOnCanvasDrop = (function () {
		var cached_function = Canvas.prototype._onDrop;
		return function(event){
			var result = cached_function.apply(this, arguments);
			preData = event.dataTransfer.getData("text/plain");
			//deprecated format still used by the old bestiary sorter
			if (preData.match( /^{\"type\":\"Encounter\",\"encounter\":\[(,?{\"name\":\"[-'\w\s]+\",\"xp\":\"\d+\",\"id\":\"[\d\w]{16}\",\"quantity\":\d+,\"pack\":\"\w+\.\w+\"})+\]}/ ) !== null){
				data = JSON.parse(preData);
				if(data.type === "Encounter"){
					IncarnateCanvas._onEncounterDrop(event,data);
				}
			}else if (preData.match( /^{\"type\":\"Encounter\",\"encounter/ ) !== null){
				data = JSON.parse(preData);
				if(data.type === "Encounter"){
					IncarnateCanvas._onEncounterDrop(event,data);
				}
			}
			return result;
		}
	})();
	Canvas.prototype._onDrop = IncarnateOnCanvasDrop;
	document.getElementById("board").ondrop = IncarnateOnCanvasDrop;
	if (game.settings.get("incarnateFiveEMod","addWeaponProp")){
		//Add to weapon properties and sort alphabetically
		mergeObject(CONFIG.DND5E.weaponProperties,{lod:"Loading",ran:"Range",spe:"Special"});
		const incarnateWeaponProperties = Object.entries(CONFIG.DND5E.weaponProperties).sort((a,b) => a[1].localeCompare(b[1]));
		const propObject = {};
		incarnateWeaponProperties.forEach(property =>{
			propObject[property[0]] = property[1];
		});
		CONFIG.DND5E.weaponProperties = propObject;
	}
	if (game.settings.get("incarnateFiveEMod","addLanguages")){
		mergeObject(CONFIG.DND5E.languages,{all:"All",alo:"Aloii",asc:"Assassins' Cant",cho:"Choice",kut:"Kutak",mik:"Mikon",oty:"Otyugh",pla:"Plainstounge",sah:"Sahuagin",sph:"Sphinx"});
		const incarnateLanguages = Object.entries(CONFIG.DND5E.languages).sort((a,b) => a[1].localeCompare(b[1]));
		const lanObject = {};
		incarnateLanguages.forEach(property =>{
			lanObject[property[0]] = property[1];
		});
		CONFIG.DND5E.languages = lanObject;
	}
	CONFIG.INCARNATE = {};
	CONFIG.INCARNATE.Official = {
		tru:"True",
		fal:"False",
		pri:"Price Modified",
		des:"Description Added",
		mec:"Mechanically Modified",
		hea:"Heavily Edited"
	}
	CONFIG.INCARNATE.RecommendedItemGenre = {
		mag: "Mage",
		mel: "Melee",
		ran: "Range",
		all: "All"
	};
	CONFIG.INCARNATE.Lore={
		cel:"Celtic",
		fan:"Fantasy",
		gre:"Greek",
		hin:"Hindu",
		inu:"Inuit",
		lib:"Libya",
		nor:"Norse",
		pro:"ProNobis",
		rea:"Real",
		rom:"Roman"
	}
	CONFIG.INCARNATE.ClassList = {
		all:"All",
		barb:"Barbarian",
		bard:"Bard",
		cle:"Cleric",
		dru:"Druid",
		fit:"Fighter",
		meg:"Megalutero",
		mon:"Monk",
		pal:"Paladin",
		ran:"Ranger",
		rog:"Rogue",
		run:"Rune Blade",
		run:"Runecrafter",
		sor:"Sorcerer",
		war:"Warlock",
		wiz:"Wizard",
		cus1:"Custom Class 1",
		cus2:"Custom Class 2",
		cus3:"Custom Class 3",
		cus4:"Custom Class 4"
	};
	CONFIG.INCARNATE.ItemRarity={
		vco:"Very Common",
		com:"Common",
		unc:"Uncommon",
		rar:"Rare",
		vra:"Very Rare",
		leg:"Legendary",
		art:"Artifact",
		artp:"Artifact +"
	}
	CONFIG.INCARNATE.Recurrence={
		nev:"Never",
		ono:"On Open",
		sho:"Short Rest",
		lon:"Long Rest",
		wee:"Weekly",
		mon:"Monthly",
		ann:"Annual"
	}
	CONFIG.INCARNATE.ItemType = {
		adv:"Adventuring Gear",
		arm:"Armor",
		cla:"Class Ability",
		foo:"Food, Drink, and Lodging",
		ing:"Ingredient",
		mou:"Mounts and Other Animals",
		mon:"Monstrous Drop",
		pot:"Potion",
		scr:"Scroll",
		too:"Tool",
		tra:"Trade Good",
		veh:"Vehicle",
		wea:"Weapon",
		won:"Wondrous Item"
	}
	CONFIG.INCARNATE.ItemSubtype = {
		lig:"Light Armor",
		med:"Medium Armor",
		hea:"Heavy Armor",
		shi:"Shield",
		simm:"Simple Melee Weapon",
		marm:"Martial Melee Weapon",
		simr:"Simple Ranged Weapon",
		marr:"Martial Ranged Weapon",
		amm:"Ammunition",
		alc:"Alcohol",
		arc:"Arcane Focus",
		art:"Artisan's Tool",
		boo:"Book",
		con:"Container",
		cos:"Cosmetic",
		dra:"Dragon",
		dru:"Druidic Focus",
		equ:"Equipment Kits",
		gam:"Gaming Set",
		hir:"Hireling",
		hol:"Holy Symbol",
		imp:"Improvised Weapon",
		inn:"Inn stay (per day)",
		lan:"Land Vehicle",
		maga:"Magical Amulet",
		mags:"Magical Stone",
		mea:"Meals (per day)",
		mou:"Mount",
		mus:"Musical Instrument",
		ped:"Pedestal of Attraction",
		pet:"Pet",
		poi:"Poisons",
		rin:"Ring",
		spo:"Spoof",
		sta:"Standard",
		sta:"Status Juice",
		too:"Tool",
		wat:"Waterborne Vehicle",
		zef:"Z Effect Coding"
	}
	CONFIG.INCARNATE.AbilityList = {
		str:"Strength",
		dex:"Dexterity",
		con:"Constitution",
		"int":"Intelligence",
		wis:"Wisdom",
		cha:"Charisma"
	};
	CONFIG.INCARNATE.SkillList = {
		acr:"Acrobatics",
		ani:"Animal Handling",
		arc:"Arcana",
		ath:"Athletics",
		dec:"Deception",
		his:"History",
		ins:"Insight",
		inv:"Investigation",
		itm:"Intimidation",
		med:"Medicine",
		nat:"Nature",
		per:"Persuasion",
		prc:"Perception",
		prf:"Performance",
		rel:"Religion",
		slt:"Sleight of Hand",
		ste:"Stealth",
		sur:"Survival"
	}
	CONFIG.INCARNATE.BeastTerrain = {
		aba:"Abandoned Ruin",
		arc:"Arctic",
		cav:"Cavern",
		coa:"Coastal",
		des:"Desert",
		fre:"Forest",
		gra:"Grassland",
		hil:"Hill",
		jun:"Jungle",
		mou:"Mountain",
		pla:"Planes",
		sew:"Sewers",
		sky:"Sky",
		swa:"Swamp",
		und:"Underwater",
		urb:"Urban",
		vol:"Volcanic"
	}
	CONFIG.DND5E.incaranteBeastSubtype = {
		neu:"50% neutral good or 50% neutral evil",
		ace:"Acephali",
		any:"Any race",
		dem:"Demon",
		dev:"Devil",
		dop:"Doppelganger",
		dwa:"Dwarf",
		elf:"Elf",
		gno:"Gnoll",
		gno:"Gnome",
		gob:"Goblinoid",
		gri:"Grimlock",
		hum:"Human",
		iji:"Ijirait",
		kob:"Kobold",
		liz:"Lizardfolk",
		mer:"Merfolk",
		orc:"Orc",
		rak:"Rakshasa",
		sah:"Sahuagin",
		tit:"Titan",
		tun:"Tuniit"
	}
	CONFIG.INCARNATE.BeastType = {
		abe:"Aberration",
		bea:"Beast",
		cel:"Celestial",
		con:"Construct",
		dra:"Dragon",
		ele:"Elemental",
		fey:"Fey",
		fie:"Fiend",
		gia:"Giant",
		hum:"Humanoid",
		mon:"Monstrosity",
		ooz:"Ooze",
		pla:"Plant",
		und:"Undead"
	}
	CONFIG.INCARNATE.BeastFunction = {
		bos:"Boss",
		cre:"Creature",
		hea:"Healer",
		min:"Minion",
		spe:"Spell"
	}
	CONFIG.INCARNATE.Tools = {
		alc:"Alchemist's Supplies",
		bag:"Bagpipes",
		bre:"Brewer's Supplies",
		cal:"Calligrapher's Supplies",
		carp:"Carpenter's Tools",
		cart:"Cartographer's Tools",
		che:"Chess Set",
		cob:"Cobbler's Tools",
		coo:"Cook's Utensils",
		dic:"Dice Set",
		dis:"Disguise Kit",
		doc:"Doctor's Tools",
		dru:"Drum",
		dul:"Dulcimer",
		flu:"Flute",
		forg:"Forgery Kit",
		gla:"Glassblower's Tools",
		harm:"Harmonica",
		harp:"Harp",
		her:"Herbalism Kit",
		hor:"Horn",
		jew:"Jeweler's Tools",
		jug:"Juggling Pins",
		keg:"Keg of Ale",
		kli:"Klimon Arm Wrestling Set",
		lea:"Leatherworker's Tools",
		lut:"Lute",
		lyr:"Lyre",
		mas:"Mason's Tools",
		mat:"Matching Cards",
		nav:"Navigator's Tools",
		pai:"Painter's Supplies",
		pan:"Pan Flute",
		pla:"Playing Card Set",
		poi:"Poisoner's Kit",
		pot:"Potter's Tools",
		sha:"Shawm",
		smi:"Smith's Tools",
		thi:"Thieves' Tools",
		tin:"Tinker's Tools",
		vio:"Viol",
		wea:"Weaver's Tools",
		woo:"Woodcarver's Tools"
	};
	mergeObject(CONFIG.DND5E.damageTypes,{nma:"non-magical weapons",nad:"non-magical weapons that are not adamantine",ncf:"non-magical weapons that are not cold-forged iron",nsi:"non-magical weapons that are not silvered"});
});
//Over-rides default compendium if compatible with a custom compendium
Hooks.on("preRenderCompendium", (emptyApp) => {
	if (emptyApp.metadata.package.match(/(incarnate)|(dnd5e)|(srdmonsters)/) !== null){
		if (emptyApp.metadata.name.match(/Background/) !== null){
			console.log("Background triggered");
			console.log("render"+emptyApp.constructor.name+" submission prevented by "+"preRender"+emptyApp.constructor.name);
			if (ui._incarnateBackgroundBrowser === undefined){
				ui._incarnateBackgroundBrowser = new IncarnateBackgroundBrowser(emptyApp.metadata);
			}else{
				ui._incarnateBackgroundBrowser.metadata = emptyApp.metadata;
			}
			ui._incarnateBackgroundBrowser.render(true);
			return false;
		}else if(emptyApp.metadata.name.match(/(Bestiary)|(monsters)/) !== null){
			console.log("render"+emptyApp.constructor.name+" submission prevented by "+"preRender"+emptyApp.constructor.name);
			if (ui._incarnateBestiaryBrowser === undefined){
				ui._incarnateBestiaryBrowser = new IncarnateBestiaryBrowser(emptyApp.metadata);
			}else{
				ui._incarnateBestiaryBrowser.metadata = emptyApp.metadata;
			}
			ui._incarnateBestiaryBrowser.render(true);
			return false;
		}else if(emptyApp.metadata.name.match(/Class/) !== null){
			console.log("render"+emptyApp.constructor.name+" submission prevented by "+"preRender"+emptyApp.constructor.name);
			if (ui._incarnateClassBrowser === undefined){
				ui._incarnateClassBrowser = new IncarnateClassBrowser(emptyApp.metadata);
			}else{
				ui._incarnateClassBrowser.metadata = emptyApp.metadata;
			}
			ui._incarnateClassBrowser.render(true);
			return false;
		}else if(emptyApp.metadata.name.match(/(Equipment)|(items)/) !== null){
			console.log("render"+emptyApp.constructor.name+" submission prevented by "+"preRender"+emptyApp.constructor.name);
			if (ui._incarnateEquipmentBrowser === undefined){
				ui._incarnateEquipmentBrowser = new IncarnateEquipmentBrowser(emptyApp.metadata);
			}else{
				ui._incarnateEquipmentBrowser.metadata = emptyApp.metadata;
			}
			ui._incarnateEquipmentBrowser.render(true);
			return false;
		}else if(emptyApp.metadata.name.match(/Races/) !== null){
			console.log("render"+emptyApp.constructor.name+" submission prevented by "+"preRender"+emptyApp.constructor.name);
			if (ui._incarnateRacesBrowser === undefined){
				ui._incarnateRacesBrowser = new IncarnateRacesBrowser(emptyApp.metadata);
			}else{
				ui._incarnateRacesBrowser.metadata = emptyApp.metadata;
			}
			ui._incarnateRacesBrowser.render(true);
			return false;
		}else if(emptyApp.metadata.name.match(/(Spells)|(spells)/) !== null){
			console.log("render"+emptyApp.constructor.name+" submission prevented by "+"preRender"+emptyApp.constructor.name);
			if (ui._incarnateSpellBrowser === undefined){
				ui._incarnateSpellBrowser = new IncarnateSpellBrowser(emptyApp.metadata);
			}else{
				ui._incarnateSpellBrowser.metadata = emptyApp.metadata;
			}
			ui._incarnateSpellBrowser.render(true);
			return false;
		}
	}
});
Hooks.on("renderIncarnateSpellBrowser", html => IncarnateCompendium.applyPreviousFilters("_incarnateSpellBrowser",html));
Hooks.on("renderIncarnateBackgroundBrowser", html => IncarnateCompendium.applyPreviousFilters("_incarnateBackgroundBrowser",html));
Hooks.on("renderIncarnateBestiaryBrowser", html => IncarnateCompendium.applyPreviousFilters("_incarnateBestiaryBrowser",html));
Hooks.on("renderIncarnateClassBrowser", html => IncarnateCompendium.applyPreviousFilters("_incarnateClassBrowser",html))
Hooks.on("renderIncarnateEquipmentBrowser", html => IncarnateCompendium.applyPreviousFilters("_incarnateEquipmentBrowser",html))
Hooks.on("renderIncarnateRacesBrowser", html => IncarnateCompendium.applyPreviousFilters("_incarnateRacesBrowser",html))
//Adds buttons to right clicking an actor in the directory allowing to either "audit" (check to make sure that all child items have the appropriate parent and removing if not) or "update" (re-pull each item from its origin)
Hooks.on("getActorDirectoryEntryContext", (html, options) => {
	options.push({
	  	name:"Actor Audit",
	  icon: '<i class="fas fa-atom"></i>',
	  callback: li => IncarnateAutoLevel.actorAudit(li.attr('data-entity-id')),
	  condition: game.user.isGM
	});
	options.push({
		name:"Update Items",
	  icon: '<i class="fas fa-user-cog"></i>',
	  callback: li => IncarnateAutoLevel.updateItems(li.attr('data-entity-id')),
	  condition: game.user.isGM
	});
});
//Adds buttons on Journal Folders to support region customization data
Hooks.on("getJournalDirectoryFolderContext", (html, options) => {
	const newOption = {
		name: "Region Settings",
		icon: '<i class="fas fa-atom"/>',
		callback: li => IncarnateRegionEntry.regionsSetup($(li)[0]),
		condition: game.user.isGM
	}
	if (options instanceof Array) options.push(newOption);
	else options[newOption.name] = newOption;
});
//Adds button to GMs blind to launch world settings configuration
Hooks.on("renderGmsBlind", (gmBlindSheet,html,data) => {
	var app = html[0];
	var form;
	if (app.tagName === "FORM"){
		form = app;
		app = IncarnateReference.getClosestClass(form,"app");
	}else{
		form = app.getElementsByTagName("form")[0];
	}
	var btn = document.createElement("button");
	btn.setAttribute("class", "inline setWorldSettings");
	btn.setAttribute("type", "button");
	btn.addEventListener("click",IncarnateWorldDefaultsEntry.regionsSetup);
	btn.innerHTML = "World Settings";
	app.getElementsByClassName("gmBlindButtons")[0].append(btn);
	IncarnateRandomEncounter.randomENavButton(app);
	IncarnateRandomEncounter.randomEDiv(app);
});
//Triggers when an item is deleted from an actor and removes anything that that item added to the actor
Hooks.on("preDeleteOwnedItem", (object,parentId,deleteId) => {
	var itemArray = Array.from(object.data.items);
	var itemLen = itemArray.length;
	for (var a=0; a<itemLen; a++){
		if (itemArray[a].id === deleteId){//When it find the item to be deleted
			if (itemArray[a].type ==="class"){
				if (itemArray[a].flags.children !== undefined){//Check if the item added other items
					const itemChildren = itemArray[a].flags.children;
					itemArray.splice(a,1);
					itemLen = itemArray.length;
					childLen = itemChildren.length;
					for (var b=0; b<childLen; b++){
						for (var c=0; c<itemLen; c++){
							if (itemArray[c].flags.origin != undefined){
								if (itemArray[c].flags.origin._id === itemChildren[b]._id){//Find an item that was added
									if (itemArray[c].flags.parents === undefined){
										if (itemArray[c].flags.children !== undefined){//compensate for presence of children on subdeleted item
											if (itemArray[c].flags.children.length > 0){
												var tempArray = IncarnateAutoLevel.subItemDelete(itemArray,itemLen,a,c);
												itemArray=tempArray[0];
												itemLen=tempArray[1];
												a=tempArray[2];
												c=tempArray[3];
											}else{
												itemArray.splice(c,1);
												itemLen = itemArray.length;
												a--;
											}
										}else{
											itemArray.splice(c,1);
											itemLen = itemArray.length;
											a--;
										}
									}else if (itemArray[c].flags.parents.length === 1){
										if (itemArray[c].flags.children !== undefined){//compensate for presence of children on subdeleted item
											if (itemArray[c].flags.children.length > 0){
												var tempArray = IncarnateAutoLevel.subItemDelete(itemArray,itemLen,a,c);
												itemArray=tempArray[0];
												itemLen=tempArray[1];
												a=tempArray[2];
												c=tempArray[3];
											}else{
												itemArray.splice(c,1);
												itemLen = itemArray.length;
												a--;
											}
										}else{
											itemArray.splice(c,1);
											itemLen = itemArray.length;
											a--;
										}
									}else{
										var itemParents = itemArray[c].flags.parents;
										var itemParLen = itemParents.length;
										var found = false;
										for (var d=0; d<itemParLen; d++){
											for (var e=0; e<itemLen; e++){
												if (itemParents[d]._id === itemArray[e]){
													found = true;
												}
											}
										}
										if (found === false){
											if (itemArray[c].flags.children !== undefined){//compensate for presence of children on subdeleted item
												if (itemArray[c].flags.children.length > 0){
													var tempArray = IncarnateAutoLevel.subItemDelete(itemArray,itemLen,a,c);
													itemArray=tempArray[0];
													itemLen=tempArray[1];
													a=tempArray[2];
													c=tempArray[3];
												}else{
													itemArray.splice(c,1);
													itemLen = itemArray.length;
													a--;
												}
											}else{
												itemArray.splice(c,1);
												itemLen = itemArray.length;
												a--;
											}
										}
									}
								}
							}
						}
					}
					object.update({items:itemArray});
					object.render(false);
					return false;
				}
			}
		}
	}
	return true;
});
//Triggers when an item is added to an actor and adds descendants to that actor
Hooks.on("preCreateOwnedItem", (object,parentId,createData) => {//background
	if (createData.type==="class"&&createData.flags.children.length>1&&(createData.flags.family==="background"||createData.flags.family==="race")){
		var actor = game.actors.get(parentId);
		var itemArray = Array.from(actor.data.items);
		var itemNum = itemArray.length;
		var itemID = 1;
		for (a = 0; a<itemNum;a++){//scans itemArray
			if (itemArray[a].id>itemID){
				itemID = itemArray[a].id;
			}
		}
		createData.id = itemID+1;
		itemArray.push(createData);
		let itemPromise = new Promise(async(resolve,reject)=>{
			await IncarnateAutoLevel.childLoop(itemArray,createData.flags.children,actor.data.data.details.level.value,createData.flags.origin);
			actor.update({items: itemArray});
			actor.render(false);
			resolve();
		})
		return false;
	}
});
//Triggers when the total level is changed on an actor and checks for new abilities gained on leveling up
Hooks.on("preUpdateActor", async (entity,updateData) => {//innate spellcasting
	let changed = Object.keys(updateData);
	if ( !changed.includes("data.details.level.value")) return;
	var actor = game.actors.get(updateData._id);
	var itemArray = Array.from(actor.data.items);
	var itemLen = itemArray.length;
	var actorLevel = updateData["data.details.level.value"];
	for (d = 0;d<itemLen;d++){
		if (itemArray[d].flags.family!== undefined){
			if (itemArray[d].flags.children !== undefined){
				if (itemArray[d].type==="feat"&&itemArray[d].flags.family==="race"&&itemArray[d].flags.children.length>0){//if it finds a race feature with children
					var tempArray = await IncarnateAutoLevel.subItemInsert(itemArray,actorLevel,itemLen,d);
					itemArray=tempArray[0];actorLevel=tempArray[1];itemLen=tempArray[2];d=tempArray[3];
				}
			}
		}
	}
	IncarnateAutoLevel.actorResourceUpdate(updateData._id,itemArray,actorLevel);
	return false;
});
//Triggers when a class is leveled up checking for new abilities gained from leveling up.
Hooks.on("preUpdateOwnedItem", async (parentEnt,actorId, item) => {//class
	let changed = Object.keys(item);
	if( !changed.includes("data.levels.value")) return;
	var actor = game.actors.get(actorId);
	var fullItem = actor.getOwnedItem(item.id).data;
	if (fullItem.flags.family!="class"){
		return true;
	}
	var itemArray = Array.from(actor.data.items);
	if (fullItem.type!="class"){
		return true;
	}
	fullItem.data.levels.value = item["data.levels.value"];
	itemArray = await IncarnateAutoLevel.childLoop(itemArray,fullItem.flags.children,Number(item["data.levels.value"]),fullItem.flags.origin);
	var itemLen = itemArray.length;
	for (var d = 0;d<itemLen;d++){
		if (itemArray[d].flags.family!== undefined){
			if (itemArray[d].flags.children !== undefined){
				if (itemArray[d].type==="feat" && itemArray[d].flags.family==="class" && itemArray[d].flags.children.length>0 && itemArray[d].flags.parents!==undefined && fullItem.flags.origin!==undefined){//if it finds a race feature with children
					var itemParents = itemArray[d].flags.parents;
					var parLen = itemParents.length;
					for (var e=0; e<parLen; e++){
						if (itemParents[e]._id === fullItem.flags.origin._id){
							var tempArray = await IncarnateAutoLevel.subItemInsert(itemArray,fullItem.data.levels.value,itemLen,d);
							itemArray=tempArray[0];itemLen=tempArray[2];d=tempArray[3];
						}
					}
				}
			}
		}
	}
	var totalLevel = 0;
	itemArray.forEach(itemVar => {
		if (itemVar.type === "class"){
			totalLevel += Number(itemVar.data.levels.value);
		}
	});
	IncarnateAutoLevel.actorResourceUpdate(actorId,itemArray,totalLevel);
	return false;
});
Hooks.on("preCreateChatMessage", (chatFunction,chatMessage) =>{
	if (chatMessage.content === undefined)return;
	if (chatMessage.content.match(/^\/help/) !== null){
		chatMessage.content += "<div><strong>5e Player Commands:</strong> /playerQuickSheet /PQS</div><div><strong>5e GM Commands:</strong> /npc (optionally followed by: background, class, archetype, race, subrace, male|female, and ending with the level as an integer)</div>";
		return true;
	}
	if (chatMessage.content.match(/^\/playerQuickSheet/i)!==null || chatMessage.content.match(/^\/PQS/i) !== null){
		incarnatePlayerQuickSheet();
		return false;
	}
	if (!game.user.isGM)return;
	//NPC Generation
	if (chatMessage.content.match(/^\/npc/i)!==null){
		npcGeneration({name:chatMessage.content.substr(5)});
		return false;
	}
});
Hooks.on("incDungeonsRoomDescription",(ev,note)=>{
	var completed = false;
	const grid = canvas.scene.data.grid;
	var hallWidth;
	if (canvas.scene.data.flags !== undefined && canvas.scene.data.flags.dungeon !== undefined && canvas.scene.data.flags.dungeon.hallWidth !== undefined){
		hallWidth = canvas.scene.data.flags.dungeon.hallWidth;
	}else{
		hallWidth = 1;
	}
	const encounters = IncarnateRandomEncounterRoll.roll(undefined,undefined,hallWidth);
	if (note.data.flags.room !== undefined){
		const room = canvas.scene.data.drawings.find(drawing => drawing.id === note.data.flags.room);
		if (room !== undefined){
			var x = room.x,
				y = room.y;
			const xEnd = room.x+room.width;
			IncarnateCanvas._onEncounterDrop(undefined,encounters.encounters[0],{p:[x,y],grid:grid,xEnd:xEnd,altKey:ev.data.originalEvent.altKey});
		}
	}
});
Hooks.on("preRenderItemSheet",(settings)=>{
	if (game.settings.get("incarnateFiveEMod","addItemFlags") === false) return true;
	settings.options.resizable = true;
});
Hooks.on("preCreateItem",(constructor,data)=>{
});
Hooks.on("renderItemSheet",(itemSheet,html,entity)=>{
	if (game.settings.get("incarnateFiveEMod","addItemFlags") === false) return true;
	const htmlDom = html[0];
	const app = IncarnateReference.getClosestClass(htmlDom,"app");
	if (app.getElementsByTagName("form")[0].classList.contains("locked")) return true;
	const data = itemSheet.object.data;
	if (data.flags === undefined)data.flags = {};
	if (data.flags.traits === undefined)data.flags.traits = {};
	console.log(itemSheet,htmlDom,data);
	const nav = htmlDom.getElementsByTagName("nav")[0];
	const body = htmlDom.getElementsByClassName("sheet-body")[0];
	const id = data._id || data.id;
	nav.append(IncarnateItemClass.newNav());
	const newTab = IncarnateItemClass.newTab(itemSheet,id);
	newTab.innerHTML += IncarnateItemClass.allTypes(data,id);
	if (data.type === "backpack" || data.type === "consumable" || data.type === "equipment" || data.type === "weapon" || data.type === "tool"){
		newTab.innerHTML += IncarnateItemClass.itemType(data);
		if (data.type === "weapon"){
			newTab.innerHTML += IncarnateItemClass.weaponType(data);
		}else if (data.type === "equipment"){
			newTab.innerHTML += IncarnateItemClass.equipmentType(data);
		}
	}else if (data.type === "feat"){
		newTab.innerHTML += IncarnateItemClass.featType(data);
	}else if (data.type === "class"){
		newTab.innerHTML += IncarnateItemClass.classType(data);
		if (data.flags.family !== undefined){
			if (data.flags.family === "class"){
				newTab.innerHTML += IncarnateItemClass.classFamily(data);
			}else if (data.flags.family === "race"){
				newTab.innerHTML += IncarnateItemClass.raceFamily(data);
			}else if (data.flags.family === "background"){
				newTab.innerHTML += IncarnateItemClass.backgroundFamily(data);
			}
		}
	}else if (data.type === "spell"){
		newTab.innerHTML += IncarnateItemClass.spellType(data);
	}
	const traitSelectors = newTab.getElementsByClassName("incTraitSelector");
	const traitSelectorHandler = ev => {
		IncarnateItemClass.onTraitSelector(ev,itemSheet);
	};
	[].forEach.call(traitSelectors, traitS =>{
		traitS.addEventListener("click",traitSelectorHandler);
	});
	body.append(newTab);
	IncarnateItemClass.activateListeners(itemSheet,htmlDom,data);
});
Hooks.on("renderTraitSelector5e",(app,html,data)=>{
	const htmlDom = html[0];
	if (app.object instanceof Item5e){
		const button = htmlDom.getElementsByTagName("button")[0];
		button.textContent = "Update Item";
	}
});
Hooks.on("renderDialog",(app,html,data)=>{
	const htmlDom = html[0];
	if (app.data.title !== undefined && app.data.title === "End Combat?"){
		const buttons = htmlDom.getElementsByClassName("dialog-buttons")[0];
		buttons.innerHTML +=
			`<button class="dialog-button itemParcel" data-button="itemParcel">
				<i class="fas fa-shopping-bag"></i>
				Loot Parcel
			</button>
			<button class="dialog-button quickXp" data-button="quickXp">
				<i class="fas fa-check"></i>
				Quick XP
			</button>`;
		const section = htmlDom.getElementsByClassName("window-content")[0];
		section.innerHTML+=
			`<div class="dialog-options">
				<div class="dialog-option">
					<label>Bonus XP</label>
					<input type="number" class="incarnateBonusXp" value="0"/>
				</div>
			</div>`;
		section.getElementsByClassName("itemParcel")[0].addEventListener("click",IncarnateLootDistributionSheet.createLootParcel);
		section.getElementsByClassName("quickXp")[0].addEventListener("click",IncarnateLootDistributionSheet.quickXp);
		htmlDom.style.height = "unset";
		htmlDom.style.width = "500px";
	}
});
//Adds a log tab on actors with log data present
Hooks.on("renderActorSheet5eCharacter",(app,html,data)=>{
	if (game.settings.get("incarnateFiveEMod","addLogTab") === false) return true;
	if (data.actor.flags.incarnateLog === undefined) return true;
	console.log(data.actor.flags);
	const htmlDom = html[0];
	const appDom = IncarnateReference.getClosestClass(htmlDom,"app");
	const contentNav = appDom.getElementsByClassName("sheet-tabs tabs content")[0];
	contentNav.innerHTML += `<a class="item" data-tab="incarnateLog">Log</a>`;
	const contentSection = appDom.getElementsByClassName("sheet-content content")[0];
	const logDiv = IncarnateCharacterSheetMods.logDiv(data);
	contentSection.append(logDiv);
	IncarnateCharacterSheetMods.activateListeners(app,contentSection,data);
});
class Incarnate5eConversions{
	static incarnatePriceConvert(price) {
		if (price === undefined){return false};
		const priceLen = price.length;
		var truePrice = Number(price.substr(0,priceLen-3).split(",").join(""));
		if (price.includes("priceless")){
			truePrice = 0;
		}
		const priceCode = price.substr(priceLen-2,2);
		if (priceCode==="GP"){
		}else if (priceCode==="SP"){
			truePrice = truePrice/10;
		}else if (priceCode==="CP"){
			truePrice = truePrice/100;
		}else if (priceCode ==="EP"){
			truePrice = truePrice/2;
		}else if (priceCode ==="PP"){
			truePrice = truePrice*10;
		}else if (Number(price)!== NaN){
			truePrice = price;
		}
		return Number(truePrice);
	}
	static abilityConvert(abr){
		if (abr === "str") return "Strength";
		else if (abr === "dex") return "Dexterity";
		else if (abr === "con") return "Constitution";
		else if (abr === "int") return "Intelligence";
		else if (abr === "wis") return "Wisdom";
		else if (abr === "cha") return "Charisma";
		else{
			console.warn(abr, " is not an ability abreviation");
			return "";
		}
	}
}
class IncarnateRegionEntry extends FormApplication {
	constructor(_id, options) {
		super(options);
		this._id = _id;
	}
	static get defaultOptions() {
		const options = super.defaultOptions;
		options.classes = ["dnd5e", "incarnate-region-settings", "sheet"];
		options.width = 500;
		options.height = window.innerHeight - 100;
		options.top = 70;
		options.left = 120;
		options.resizable = true;
		options.submitOnUnfocus = true;
		options.template = "modules/incarnateFiveEMod/templates/incarnateRegionSettings.html";
		return options;
	}
	static regionsSetup(elem) {
		const _id = elem.getElementsByClassName("create-entity")[0].getAttribute("data-folder");
		ui._incarnateRegionSetup = new IncarnateRegionEntry(_id);
		ui._incarnateRegionSetup.render(true);
	}
	/**
	* Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
	*/
	getData() {
		var regionFolder = game.folders.get(this._id);
		var flags = JSON.parse(JSON.stringify(regionFolder.data.flags));
		if (regionFolder.data.flags.incRegions === undefined){
			if (regionFolder._parent._id !== null){
				const parentFolder = game.folders.get(regionFolder._parent._id);
				if (parentFolder.data.flags.incRegions === undefined){
					flags.incRegions = game.settings.get("incarnate","incRegions");
					flags.incRegions.incStatRoll = game.settings.get("incarnate","incStatRoll");
				}else{
					flags.incRegions = parentFolder.data.flags.incRegions;
					if (flags.incRegions.incStatRoll === undefined){//conversion script added on 9/13/2019 to add support for regional stat roll settings in older data sets
						flags.incRegions.incStatRoll = game.settings.get("incarnate","incStatRoll");
					}
				}
			}else{
				flags.incRegions = game.settings.get("incarnate","incRegions");
				flags.incRegions.incStatRoll = game.settings.get("incarnate","incStatRoll");
			}
			IncarnateReference.sortAlphabeticallyName(flags.incRegions.backgrounds);
			IncarnateReference.sortAlphabeticallyName(flags.incRegions.classes);
			IncarnateReference.sortAlphabeticallyName(flags.incRegions.races);
			regionFolder.update({flags:flags});
		}
		const data = {incRegions:flags.incRegions,folder:regionFolder};

		// Return data for rendering
		this.options.title = regionFolder.name;
		this.data = data;
		return data;
	}
	get id(){
		return "regionSettings-" + this._id;
	}
	activateListeners(html) {
		super.activateListeners(html);
		const htmlDom = $(html)[0];
		//listener to make tabs work
		let nav = $('.tabs[data-group="group1"]');
		new Tabs(nav, {
			initial: "tab1",
			callback: t => console.log("Tab ${t} was clicked")
		});
		if (!game.user.isGM) return false;
		htmlDom.getElementsByClassName("incarnate-regions-input");
		[].forEach.call(htmlDom, element => element.addEventListener("change",event=> {
			this._updateObject(event);
		}));
		//Everything below this is only for region folders
		if (this.data.folder === undefined) return false;
		//Add and delete buttons in npc stat roll section
		let handlerAddLeast = async ev =>{
			const regionId = IncarnateReference.getClosestClass(ev.srcElement,"app").getAttribute("id").split("-")[1];
			const folder = game.folders.get(regionId);
			const flags = JSON.parse(JSON.stringify(folder.data.flags));
			flags.incRegions.incStatRoll.guarantee.atLeast.push({value:0, quantity:0});
			folder.update({flags:flags});
			await IncarnateReference.incarnateDelay(50);
			this.render(false);
		}
		let handlerDeleteLeast = async ev =>{
			const leastId = IncarnateReference.getClosestClass(ev.srcElement,"atLeast-entry").getAttribute("data-id");
			const regionId = IncarnateReference.getClosestClass(ev.srcElement,"app").getAttribute("id").split("-")[1];
			const folder = game.folders.get(regionId);
			const flags = JSON.parse(JSON.stringify(folder.data.flags));
			flags.incRegions.incStatRoll.guarantee.atLeast.splice(leastId,1);
			folder.update({flags:flags});
			await IncarnateReference.incarnateDelay(50);
			this.render(false);
		}
		let handlerAddMost = async ev =>{
			const regionId = IncarnateReference.getClosestClass(ev.srcElement,"app").getAttribute("id").split("-")[1];
			const folder = game.folders.get(regionId);
			const flags = JSON.parse(JSON.stringify(folder.data.flags));
			flags.incRegions.incStatRoll.guarantee.atMost.push({value:0, quantity:0});
			folder.update({flags:flags});
			await IncarnateReference.incarnateDelay(50);
			this.render(false);
		}
		let handlerDeleteMost = async ev =>{
			const mostId = IncarnateReference.getClosestClass(ev.srcElement,"atMost-entry").getAttribute("data-id");
			const regionId = IncarnateReference.getClosestClass(ev.srcElement,"app").getAttribute("id").split("-")[1];
			const folder = game.folders.get(regionId);
			const flags = JSON.parse(JSON.stringify(folder.data.flags));
			flags.incRegions.incStatRoll.guarantee.atMost.splice(mostId,1);
			folder.update({flags:flags});
			await IncarnateReference.incarnateDelay(50);
			this.render(false);
		}
		let addLeast = htmlDom.getElementsByClassName("atLeast-create");
		[].forEach.call(addLeast, add=>{
			add.addEventListener("click",handlerAddLeast);
		});
		let deleteLeast = htmlDom.getElementsByClassName("atLeast-delete");
		[].forEach.call(deleteLeast, setting=>{
			setting.addEventListener("click",handlerDeleteLeast);
		});
		let addMost = htmlDom.getElementsByClassName("atMost-create");
		[].forEach.call(addMost, add=>{
			add.addEventListener("click",handlerAddMost);
		});
		let deleteMost = htmlDom.getElementsByClassName("atMost-delete");
		[].forEach.call(deleteMost, setting=>{
			setting.addEventListener("click",handlerDeleteMost);
		});
		//Functions from setup tab
		var setupRegionHandler = ev => {
			IncarnateRegion.setRegionDefault(this._id);
			IncarnateReference.incarnateDelay(3000)
			.then(result => this.render(false));
		}
		var clearRegionHandler = ev => {
			IncarnateRegion.setRegionEmpty(this._id);
			IncarnateReference.incarnateDelay(200)
			.then(result => this.render(false));
		}
		var addCompendiumHandler = ev =>{
			const packs = game.packs;
			var selection =[];
			var packlist = [];
			packs.forEach(pack => {
				packlist.push({
					value:pack.metadata.module + "." + pack.metadata.name,
					name: pack.metadata.label
				});
			});
			packlist.sort(function(a,b){
				const x = a.name.toLowerCase();
				const y = b.name.toLowerCase();
				if (x < y) {return -1};
				if (y < x) {return 1};
				return 0;
			});
			selection.push({
				name: "Compendium",
				options:packlist
			});
			selection.push({
				name: "Type",
				options:[
					{
						value:"backgrounds",
						name:"Backgrounds"
					},
					{
						value:"classes",
						name:"Classes"
					},
					{
						value:"races",
						name:"Races"
					}
				]
			});
			new IncarnateDialog({
				title: `Add Options from Compendium?`,
				content: "<p> Which compendium do you wish to import from? What type of data does it contain?</p>",
				buttons: {
					addCompendium:{
						label: "Add Compendium",
						callback: ()=> {
							const app = IncarnateReference.getClosestClass(event.srcElement,"app");
							const pack = app.getElementsByClassName("Compendium")[0].value;
							const type = app.getElementsByClassName("Type")[0].value;
							const target = {
								type: "folder",
								path: this.data.folder.data._id
							}
							IncarnateRegion.incarnateAddFromCompendium(target, type, pack);
							IncarnateReference.incarnateDelay(1500)
							.then(result => this.render(false));
						}
					}
				},
				selection: selection,
				default: "addCompendium"
			}).render(true);
		}
		var mirrorWorldSettings = ev =>{
			IncarnateRegion.setRegionToWorld(this._id);
			IncarnateReference.incarnateDelay(200)
			.then(result => this.render(false));
		}
		var mirrorParentSettings = ev =>{
			IncarnateRegion.setRegionToParent(this._id);
			IncarnateReference.incarnateDelay(200)
			.then(result => this.render(false));
		}
		htmlDom.getElementsByClassName("setup-regions")[0].addEventListener("click",setupRegionHandler);
		htmlDom.getElementsByClassName("clear-regions")[0].addEventListener("click",clearRegionHandler);
		htmlDom.getElementsByClassName("add-compendium")[0].addEventListener("click",addCompendiumHandler);
		htmlDom.getElementsByClassName("mirror-world-settings")[0].addEventListener("click",mirrorWorldSettings);
		htmlDom.getElementsByClassName("mirror-parent-settings")[0].addEventListener("click",mirrorParentSettings);
		console.log(this);
		if (this.data.folder.data.parent === null){
			htmlDom.getElementsByClassName("mirror-parent-settings")[0].remove();
		}
	}
	_updateObject(ev){
		var incRegions = JSON.parse(JSON.stringify(game.folders.get(this._id).data.flags.incRegions));
		var newValue = ev.srcElement.value;
		if (ev.srcElement.type === "number"){
			var newValue = Number(newValue);
			if (newValue < 0){
				newValue = 0;
			}
		}
		setProperty(incRegions, ev.srcElement.name, newValue);
		game.folders.get(this._id).update({flags:{incRegions:incRegions}});
	}
}
class IncarnateWorldDefaultsEntry extends IncarnateRegionEntry {
	constructor(_id, options) {
		super(options);
	}
	static regionsSetup() {
		ui._incarnateRegionSetup = new IncarnateWorldDefaultsEntry();
		ui._incarnateRegionSetup.render(true);
	}
	/**
	* Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
	*/
	getData() {
		var incRegions = game.settings.get("incarnate","incRegions");
		IncarnateReference.sortAlphabeticallyName(incRegions.backgrounds);
		IncarnateReference.sortAlphabeticallyName(incRegions.classes);
		IncarnateReference.sortAlphabeticallyName(incRegions.races);
		if (incRegions.incStatRoll === undefined) incRegions.incStatRoll = game.settings.get("incarnate","incStatRoll");
		const data = {incRegions:incRegions};

		// Return data for rendering
		this.options.title = "World Settings";
		this.data = data;
		return data;
	}
	_updateObject(ev){
		var newValue = ev.srcElement.value;
		if (ev.srcElement.type==="number"){
			var newValue = Number(newValue);
			if (newValue < 0){
				newValue = 0;
			}
		}
		var data = JSON.parse(JSON.stringify(game.settings.get("incarnate","incRegions")));
		setProperty(data, ev.srcElement.name, newValue);
		game.settings.set("incarnate","incRegions",data);
	}
	activateListeners(html){
		super.activateListeners(html);
		const htmlDom = $(html)[0];
		var setupRegionHandler = ev => {
			IncarnateRegion.setDefaultDefault();
			IncarnateReference.incarnateDelay(3000)
			.then(result => this.render(false));
		}
		var clearRegionHandler = ev => {
			IncarnateRegion.setDefaultEmpty();
			IncarnateReference.incarnateDelay(200)
			.then(result => this.render(false));
		}
		var addCompendiumHandler = ev =>{
			const packs = game.packs;
			var selection =[];
			var packlist = [];
			packs.forEach(pack => {
				packlist.push({
					value:pack.metadata.module + "." + pack.metadata.name,
					name: pack.metadata.label
				});
			});
			packlist.sort(function(a,b){
				const x = a.name.toLowerCase();
				const y = b.name.toLowerCase();
				if (x < y) {return -1};
				if (y < x) {return 1};
				return 0;
			});
			selection.push({
				name: "Compendium",
				options:packlist
			});
			selection.push({
				name: "Type",
				options:[
					{
						value:"backgrounds",
						name:"Backgrounds"
					},
					{
						value:"classes",
						name:"Classes"
					},
					{
						value:"races",
						name:"Races"
					}
				]
			});
			new IncarnateDialog({
				title: `Add Options from Compendium?`,
				content: "<p> Which compendium do you wish to import from? What type of data does it contain?</p>",
				buttons: {
					addCompendium:{
						label: "Add Compendium",
						callback: ()=> {
							const app = IncarnateReference.getClosestClass(event.srcElement,"app");
							const pack = app.getElementsByClassName("Compendium")[0].value;
							const type = app.getElementsByClassName("Type")[0].value;
							const target = {
								type: "gameSettings",
								path: "incarnate.incRegions"
							}
							IncarnateRegion.incarnateAddFromCompendium(target, type, pack);
							IncarnateReference.incarnateDelay(1500)
							.then(result => this.render(false));
						}
					}
				},
				selection: selection,
				default: "addCompendium"
			}).render(true);
		}
		htmlDom.getElementsByClassName("setup-regions")[0].addEventListener("click",setupRegionHandler);
		htmlDom.getElementsByClassName("clear-regions")[0].addEventListener("click",clearRegionHandler);
		htmlDom.getElementsByClassName("add-compendium")[0].addEventListener("click",addCompendiumHandler);
		htmlDom.getElementsByClassName("mirror-world-settings")[0].remove();
		htmlDom.getElementsByClassName("mirror-parent-settings")[0].remove();
		//Add and delete buttons in npc stat roll section
		let handlerAddLeast = async ev =>{
			const incRegions = game.settings.get("incarnate","incRegions");
			incRegions.incStatRoll.guarantee.atLeast.push({value:0, quantity:0});
			game.settings.set("incarnate","incRegions",incRegions);
			await IncarnateReference.incarnateDelay(50);
			this.render(false);
		}
		let handlerDeleteLeast = async ev =>{
			const leastId = IncarnateReference.getClosestClass(ev.srcElement,"atLeast-entry").getAttribute("data-id");
			const incRegions = game.settings.get("incarnate","incRegions");
			incRegions.incStatRoll.guarantee.atLeast.splice(leastId,1);
			game.settings.set("incarnate","incRegions",incRegions);
			await IncarnateReference.incarnateDelay(50);
			this.render(false);
		}
		let handlerAddMost = async ev =>{
			const incRegions = game.settings.get("incarnate","incRegions");
			incRegions.incStatRoll.guarantee.atMost.push({value:0, quantity:0});
			game.settings.set("incarnate","incRegions",incRegions);
			await IncarnateReference.incarnateDelay(50);
			this.render(false);
		}
		let handlerDeleteMost = async ev =>{
			const mostId = IncarnateReference.getClosestClass(ev.srcElement,"atMost-entry").getAttribute("data-id");
			const incRegions = game.settings.get("incarnate","incRegions");
			incRegions.incStatRoll.guarantee.atMost.splice(mostId,1);
			game.settings.set("incarnate","incRegions",incRegions);
			await IncarnateReference.incarnateDelay(50);
			this.render(false);
		}
		let addLeast = htmlDom.getElementsByClassName("atLeast-create");
		[].forEach.call(addLeast, add=>{
			add.addEventListener("click",handlerAddLeast);
		});
		let deleteLeast = htmlDom.getElementsByClassName("atLeast-delete");
		[].forEach.call(deleteLeast, setting=>{
			setting.addEventListener("click",handlerDeleteLeast);
		});
		let addMost = htmlDom.getElementsByClassName("atMost-create");
		[].forEach.call(addMost, add=>{
			add.addEventListener("click",handlerAddMost);
		});
		let deleteMost = htmlDom.getElementsByClassName("atMost-delete");
		[].forEach.call(deleteMost, setting=>{
			setting.addEventListener("click",handlerDeleteMost);
		});
	}
}
async function npcGeneration(template, parentElement){
	var settings = game.settings.get("incarnate","incRegions");
	var region,regionSettings,pairedActorFolder;
	if (settings.currentRegion !== undefined){
		region = game.folders.get(settings.currentRegion);
		if (region !== undefined){
			if (region.data.flags.incRegions !== undefined){
				settings = region.data.flags.incRegions;//over-ride settings with more specific region settings
			}
			if (region.data.flags.pairedActorFolder === undefined){
				pairedActorFolder = await Folder.create({name:region.data.name,type:"Actor",parent:null});
				region.update({flags:{pairedActorFolder: pairedActorFolder.data._id}});
			}else{
				pairedActorFolder = game.folders.get(region.data.flags.pairedActorFolder);
				if (pairedActorFolder === undefined){
					pairedActorFolder = await Folder.create({name:region.data.name,type:"Actor",parent:null});
					region.update({flags:{pairedActorFolder: pairedActorFolder.data._id}});
				}
			}
		}else{
			alert("Folder selected in GMs Blind (anvil) does not exist, please select a new folder");
			return false;
			//create region and replace currentRegion in incRegions
		}
	}else{
		alert("No folder selected in GMs Blind (anvil) please select a folder. (Selection occurs on change not on blind open)");
		return false;
		//assign first folder
	}
	console.log(settings);
	var background, classs, gender, level, name, race, token;
	background = await IncarnateNpcGeneration.classFind(template.name,settings.backgrounds);
	classs = await IncarnateNpcGeneration.classFind(template.name,settings.classes);
	race = await IncarnateNpcGeneration.classFind(template.name,settings.races);
	const assignedLevelStart = template.name.search(/[0-9]/);
	if (assignedLevelStart !== -1){
		const assignedLevel = Number(template.name.substr(assignedLevelStart));
		if (assignedLevel > 0){
			level = assignedLevel;
		}else{
			level = await IncarnateNpcGeneration.setLevel(settings.partyLevel);
		}
	}else{
		level = await IncarnateNpcGeneration.setLevel(settings.partyLevel);
	}
	gender = template.name.match(/male/i) !== null ? "Male":
		template.name.match(/female/i) !== null ? "Female":
		Math.random() < 0.5 ? "Male" : "Female";
	rollCount++;
	const raceItem = await IncarnateAutoLevel.incarnateFormatItem(race._id,race.pack,1);
	var classItem = await IncarnateAutoLevel.incarnateFormatItem(classs._id,classs.pack,2);
	const backgroundItem = await IncarnateAutoLevel.incarnateFormatItem(background._id,background.pack,3);
	classItem.data.levels.value = level;
	name = await IncarnateNpcGeneration.itemTable(raceItem,"raceName",gender,"Norm");
	fathersName = await IncarnateNpcGeneration.itemTable(raceItem,"raceName","Male","Norm");
	clanName = await IncarnateNpcGeneration.itemTable(raceItem,"raceNameClan","","");
	name = IncarnateReference.sanitizeName(name);
	fathersName = IncarnateReference.sanitizeName(fathersName);
	name = gender === "Male" ? name + " son of " + fathersName : name + " daughter of " + fathersName;
	if (clanName !== ""){
		clanName = IncarnateReference.sanitizeName(clanName);
		name = name + " of clan " + clanName;
	}
	token = await IncarnateNpcGeneration.itemTable(raceItem,"raceImage",gender,"icons/svg/mystery-man.svg");
	if (token !== "icons/svg/mystery-man.svg"){
		token = IncarnateReference.sanitizeName(token);
		game.socket.emit("getFiles", token, {wildcard: true}, images => {
			if (images.error) reject(images.error);
			if (images.files.length > 0){
				const possibleTokens = images.files;
				token = possibleTokens[Math.floor(possibleTokens.length*Math.random())].replace(/\.\.\/\.\.\/\.\.\//,"");
				rollCount++;
			}else{
				console.warn("No match for: ",token)
			}
		});
	}
	var items=[];
	items.push(raceItem);
	items.push(classItem);
	items.push(backgroundItem);
	items = await IncarnateAutoLevel.childLoop(items,classItem.flags.defaults.startingEquipment,level);
	if (classItem.flags.defaults.spells !== undefined){
		items = await IncarnateAutoLevel.childLoop(items,classItem.flags.defaults.spells,level);
	}
	var itemCount = 3;
	var statArray = settings.incStatRoll !== undefined ? IncarnateStatRoll.statRoll(settings.incStatRoll.dice, settings.incStatRoll.guarantee, settings.incStatRoll.rolls, settings.incStatRoll.abortCountTrigger) : IncarnateNpcGeneration.statArray();
	var abilities = IncarnateNpcGeneration.abilityPrep(classItem,statArray,Math.floor(level/2));
	raceItem.flags.raceBoosts.forEach(boost =>{
		if (boost.ability !== "choice"){
			abilities[boost.ability.substr(0,3)].value+=boost.change;
		}
	});
	const maxBoosted = settings.incStatRoll !== undefined ? settings.incStatRoll.maxBoosted : undefined;
	abilities = IncarnateNpcGeneration.abilityImprovement(classItem,abilities,Math.floor(level/2),maxBoosted);
	var hp = classItem.flags.dieSize + (classItem.flags.dieSize/2+1)*(level-1) + abilities.con.mod*(level);
	var personality1 = await IncarnateNpcGeneration.itemTable(backgroundItem,"personality","",""), personality2, abortCount=0;
	do{
		personality2 = await IncarnateNpcGeneration.itemTable(backgroundItem,"personality","","");
		abortCount++;
	}while (personality1 === personality2 && abortCount < 6);
	var bio = "<p><strong>Personality:</strong></p>" + personality1  + personality2 + "<p><strong>Ideal</strong></p>" + await IncarnateNpcGeneration.itemTable(backgroundItem,"ideal","","") + "<p><strong>Bond</strong></p>" + await IncarnateNpcGeneration.itemTable(backgroundItem,"bond","","") + "<p><strong>Flaw</strong></p>" + await IncarnateNpcGeneration.itemTable(backgroundItem,"flaw","","") + "<p><strong>Description</strong></p>" + await IncarnateNpcGeneration.itemTable(raceItem,"raceDescription",gender,"");
	if (parentElement !== undefined) bio = parentElement + bio;
	var actor = await Actor5e.create({
		name:name,
		type:"character",
		folder:pairedActorFolder.data._id,
		items:items,
		img:token,
		data:{
			abilities:abilities,
			attributes:{
				hd:{
					label:"Hit Dice",
					min:0,
					"type":"Number",
					value:level
				},
				hp:{
					max:hp,
					value:hp
				}
			},
			details:{
				background:{
					value:backgroundItem.name
				},
				biography:{
					value:bio
				},
				level:{
					value:level
				},
				race:{
					value:raceItem.name
				}
			}
		},
		token:{
			img:token,
			actorLink:true,
			bar1:{attribute: "attributes.hp",label:"Hit Points",max:hp,min:0,temp:0,tempmax:0,type:"Number",value:hp},
			bar2:{attribute:""},
			brightSight: raceItem.flags.raceDarkvision > 0 ? raceItem.flags.raceDarkvision*2/3 : -1,
			dimSight: raceItem.flags.raceDarkvision > 0 ? raceItem.flags.raceDarkvision : -1,
			displayBars:40,
			displayName:50,
			disposition:0,
			name: name.split(" ")[0] !== "" ? name.split(" ")[0] : name.split(" ")[1],
			vision:true
		}
	},{displaySheet:false});
	await IncarnateAutoLevel.actorAudit(actor.data._id);
	return actor;
}
class IncarnateNpcGeneration{
	static async itemTable(item,tablePrefix,gender,backup){
		if (item.flags.tables !== undefined){
			if (item.flags.tables[tablePrefix+gender] !== undefined){
				var result = await IncarnateReference.rollTable(item.flags.tables[tablePrefix+gender]);
				result = await IncarnateReference.generation(result.outerHTML)
				return result;
			}else{
				return backup;
			}
		}else{
			return backup;
		}
	}
	static setLevel(partyLevel){
		var plusOrMinus = Math.random() < 0.5 ? -1 : 1;
		rollCount++;
		var level = partyLevel + Math.random() * (1 + partyLevel/4) * plusOrMinus;
		rollCount++;
		level = Math.floor(level);
		level = level<1 ? 1 : level;
		level = level>20 ? 20 : level;
		return level;
	}
	static classFind(templateName,possibilities){
		var loopLen = possibilities.length, result, resultTotal=0;
		for (var a=0; a<loopLen; a++){
			if (templateName.includes(possibilities[a].name)){
				result = possibilities[a];
				break;
			}else{
				resultTotal += possibilities[a].priority;
			}
		}
		if (result === undefined){
			var totalPriority = 0;
			var targetPriority = resultTotal * Math.random();
			rollCount++;
			for (var a=0; a<loopLen; a++){
				totalPriority += possibilities[a].priority;
				if (targetPriority <= totalPriority){
					result = possibilities[a];
					break;
				}
			}
		}
		if (result.archetypes === undefined) return result;
		if (result.archetypes.length > 0){
			loopLen = result.archetypes.length;
			var found=false, archetypeTotal=0;
			for (var a=0; a<loopLen; a++){
				if (templateName.includes(result.archetypes[a].name)){
					result = result.archetypes[a];
					found=true;
					break;
				}else{
					archetypeTotal += result.archetypes[a].priority;
				}
			}
			if (found === false){
				var totalPriority = 0;
				var targetPriority = archetypeTotal * Math.random();
				rollCount++;
				for (var a=0; a<loopLen; a++){
					totalPriority += result.archetypes[a].priority;
					if (targetPriority <= totalPriority){
						result = result.archetypes[a];
						break;
					}
				}
			}
		}
		return result;
	}
	static statArray(){
		var statArray = [];
		for (var a=0; a<6; a++){
			statArray.push(IncarnateReference.incarnateRoll("3d6"));
		}
		statArray.sort(function(a,b){return b-a});
		rollCount += 18;
		return statArray;
	}
	static abilityImprovement(classItem,abilities,abilityScoreIncrease,maxBoosted){
		maxBoosted = maxBoosted || 20;
		const statPriority=[classItem.flags.classStat1,classItem.flags.classStat2,classItem.flags.classStat3,classItem.flags.classStat4,classItem.flags.classStat5,classItem.flags.classStat6];
		for(var a=0; a<6; a++){
			const stat = statPriority[a].substring(0,3);
			if (abilityScoreIncrease > 0 && abilities[stat].value < maxBoosted){
				do{
					abilityScoreIncrease--;
					abilities[stat].value++;
				}while(abilityScoreIncrease > 0 && abilities[statPriority[a].substring(0,3)].value < maxBoosted);
			}else if (abilities[stat].value > maxBoosted) abilities[stat].value = maxBoosted;
			const mod = IncarnateAutoLevel.incarnateStatConvert(abilities[stat].value);
			abilities[stat].mod = mod;
			abilities[stat].save = mod;
		}
		return abilities;
	}
	static abilityPrep(classItem,statArray){
		var abilities={};
		const statPriority=[classItem.flags.classStat1,classItem.flags.classStat2,classItem.flags.classStat3,classItem.flags.classStat4,classItem.flags.classStat5,classItem.flags.classStat6];
		for (var a=0; a<6; a++){
			var value = statArray[a];
			var shortName = statPriority[a].substring(0,3);
			abilities[shortName] = {
				type:"Number",
				label:statPriority[a],
				value:value,
				min:3,
				proficient:0,
			}
		}
		return abilities;
	}
}
/**
* Automated Leveling Up
*/
class IncarnateAutoLevel{
	static async updateItems(actorId){
		var actor = game.actors.get(actorId);
		var itemArray = Array.from(actor.data.items);
		var itemLen = itemArray.length;
		var calledPacks =[];
		for (var a=0; a<itemLen; a++){
			var packFound = false;
			if (itemArray[a].flags.origin!==undefined){
				var calledPackLen = calledPacks.length;
				for (var c=0; c<calledPackLen; c++){
					if (calledPacks[c].name === itemArray[a].flags.origin.pack){
						packFound = true;
						var originItem = await IncarnateReference.lookupItemComplete(itemArray[a].flags.origin._id,itemArray[a].flags.origin.pack,calledPacks[c].content);
					}
				}
				if (packFound === false){
					const prePackContent = await IncarnateReference.incarnatePackFind(itemArray[a].flags.origin.pack);
					const packContent = await prePackContent.getContent();
					calledPacks.push({name:itemArray[a].flags.origin.pack,content:packContent});
					var originItem = await IncarnateReference.lookupItemComplete(itemArray[a].flags.origin._id,itemArray[a].flags.origin.pack,packContent);
				}
				originItem = originItem[0];
				if (originItem !== false){
					var preparedStatus, originItemLevel;
					if (itemArray[a].type ==="spell"){
						preparedStatus = itemArray[a].data.prepared.value;
					}else if (itemArray[a].type === "class"){
						originItemLevel = itemArray[a].data.levels.value;
					}
					var itemId = itemArray[a].id;
					var itemParents = itemArray[a].flags.parents;
					var itemName = itemArray[a].name;
					itemArray[a] = originItem.data;
					itemArray[a].id = itemId;
					if (itemArray[a].type ==="spell"){
						itemArray[a].data.prepared.value = preparedStatus;
					} else if (itemArray[a].type === "class"){
						itemArray[a].data.levels.value = originItemLevel;
					}
					if (itemArray[a].flags.parents === undefined){
						itemArray[a].flags.parents = itemParents;
						itemArray[a].name = itemName;
					}
				}
			}
		}
		actor.update({items:itemArray});
		actor.render(false);
		alert("Update Items Completed");
	}
	static async subItemInsert(itemArray,actorLevel,itemLen,d){
		var childArray = itemArray[d].flags.children;
		var childLen = childArray.length;
		var parentRef = itemArray[d].flags.origin;
		var itemArray = await IncarnateAutoLevel.childLoop(itemArray,childArray,actorLevel,parentRef," - "+parentRef.name);//add children nodes to array
		if (itemArray.length !== itemLen){//checks to see if loop size changed
			if (itemArray.length > itemLen){//compensates for loop size change
				itemLen = itemArray.length;
			}else if (itemArray.length < itemLen){
				d = d - itemLen + itemArray.length;
				if (d<0){d=0};
				itemLen = itemArray.length;
			}
		}
		const tempArray = [itemArray,actorLevel,itemLen,d];
		return tempArray;
	}
	static subItemDelete(itemArray,itemLen,a,c){
		var subItemChildren = itemArray[c].flags.children;
		var subLen = subItemChildren.length;
		var memoryId = itemArray[c].flags.origin._id;
		itemArray.splice(c,1);
		itemLen = itemArray.length;
		a--;
		for (var f=0; f<subLen; f++){
			for (var g=0; g<itemLen; g++){
				if (itemArray[g].flags.origin !== undefined && itemArray[g].flags.parents !== undefined){
					if (itemArray[g].flags.origin._id === subItemChildren[f]._id && itemArray[g].flags.parents.length > 0){
						if (itemArray[g].flags.parents[0]._id === memoryId){
							itemArray.splice(g,1);
							itemLen = itemArray.length;
							a--;
						}
					}else if (itemArray[g].flags.parents.length === undefined){
						console.log("ERROR: parents length undefined on - ",itemArray[g]);
					}
				}
			}
		}
		const tempArray=[itemArray,itemLen,a,c];
		return tempArray; 
	}
	/*
	 * itemID - source item ID
	 * pack - source item pack
	 * newID - id to be assigned to the new item
	 * itemName - name over-ride for new item
	 * characterID - character the source item is on
	 * packContent - if the pack has already been called, include its data to speed up function
	 * actorData - if source actor has already been called, include its data to speed up function
	 */
	static async incarnateFormatItem(itemID,pack,newID,itemName,characterID,nameSuffix,packContent,actorData){//returns new item ready to be pushed into array
		//console.log("itemID",itemID,"pack",pack,"newID",newID,"itemName",itemName,"characterID",characterID,"nameSuffix",nameSuffix);
		var origin="", newItem = {}, tempItem={}, foundPack,tempOrigin;
		if (characterID !== undefined){
			if (actorData === undefined){
				tempOrigin = await IncarnateReference.lookupActorComplete(characterID,pack,packContent);
				tempOrigin = tempOrigin[0];
			}else{
				tempOrigin = actorData;
			}
			if (tempOrigin === false || tempOrigin === undefined){
				console.log("Character: ",characterID," not found");
				return false;
			}else {
				origin = tempOrigin.data.items;
			}
			var originLen = origin.length;
			for (var b=0;b<originLen;b++){
				if (origin[b].id === itemID){
					tempItem={data:{
						flags:origin[b].flags,
						name:origin[b].name,
						type:origin[b].type,
						img:origin[b].img,
						data:origin[b].data
					}}
				}
			}
		}else {
			tempItem= await IncarnateReference.lookupItemComplete(itemID,pack,packContent);
			tempItem = tempItem[0];
			if (tempItem === false){
				console.log("Item: ",itemID," not found");
				return false;
			}
		}
		newItem = tempItem.data;
		newItem.id = newID;
		if (itemName != null){
			newItem.name+=itemName;
		}
		if (nameSuffix){
			newItem.name+= nameSuffix;
		}
		return newItem;
	}
	static async childLoop(itemArray,childArray,level,parentRef,nameSuffix){//adds children of relevant level to itemArray
		//console.log("child loop begun","itemArray",itemArray,"childArray",childArray,"level",level,"parentRef",parentRef,"nameSuffix",nameSuffix);
		var found = false;
		var itemID=0;
		var childrenNum = childArray.length;
		var itemNum = itemArray.length;
		for (var a = 0; a<itemNum;a++){//scans itemArray
			if (itemArray[a].id>itemID){
				itemID = itemArray[a].id;
			}
		}
		var promises=[];
		var calledPacks =[];
		for (var b = 0; b<childrenNum; b++){//looks for children
			var childID = childArray[b]._id;
			if (childArray[b].level <= level){//of appropriate level
				found = false;
				for (var c = 0; c<itemNum; c++){//checks to see if ability is already on character sheet
					if (itemArray[c].flags.origin !== undefined){
						if (itemArray[c].flags.origin._id === childID){
							found = true;
						}
					}
				}
				if (found === false){//if not adds it
					itemID++;
					var packFound = false;
					var newItem;
					//console.log("adding: ",childArray[b].name);
					var calledPackLen = calledPacks.length;
					for (var c=0; c<calledPackLen; c++){
						if (calledPacks[c].name === childArray[b].pack){
							packFound = true;
							newItem = await IncarnateAutoLevel.incarnateFormatItem(childID,childArray[b].pack,itemID,undefined,undefined,nameSuffix,calledPacks[c].content)
						}
					}
					if (packFound === false){
						const prePackContent = await IncarnateReference.incarnatePackFind(childArray[b].pack);
						const packContent = await prePackContent.getContent();
						calledPacks.push({name:childArray[b].pack,content:packContent});
						newItem = await IncarnateAutoLevel.incarnateFormatItem(childID,childArray[b].pack,itemID,undefined,undefined,nameSuffix,packContent)
					}
					if (newItem.flags === undefined){
						console.warn("new item has no flags",newItem," child array: ",childArray[b]);
					}else{
						if (newItem.flags.parents === undefined && parentRef !== undefined){//If there is no parents node then give it the parent ref
							newItem.flags.parents = [parentRef];
						}
						if (childArray[b].quantity !== undefined){
							newItem.data.quantity.value = childArray[b].quantity;
						}
						itemArray.push(newItem);
					}
				}
			}
		}
		for (var b = 0; b<childrenNum; b++){//looks for children
			var childID = childArray[b]._id;
			if (childArray[b].level > level){//of inappropriate level
				for (var c = itemNum-1; c>-1; c--){//checks to see if ability is already on character sheet
					if (itemArray[c].flags.origin !== undefined){
						if (itemArray[c].flags.origin._id === childID){
							if (itemArray[c].flags.children!==undefined){
								if (itemArray[c].flags.children.length>0){
									itemArray = IncarnateAutoLevel.subItemDelete(itemArray,itemNum,0,c)[0];
									itemNum=itemArray.length;
									if (c > itemNum-1){c=itemNum-1};
								}else{
									itemArray.splice(c,1);//removes it
									itemNum=itemArray.length;}
							}else{
								itemArray.splice(c,1);//removes it
								itemNum=itemArray.length;
							}
						}
					}
				}
			}
		}
		return itemArray;
	}
	static async actorLevelChangeBackground(actorID,itemArray){//When background is added adds background abilities
		var actor = game.actors.get(actorID);
		var itemLen = itemArray.length;
		var actorLevel = actor.data.data.details.level.value;
		for (var d = 0;d<itemLen;d++){
			if (itemArray[d].type==="class"&&itemArray[d].flags.family==="background"){//if it finds a background
			var childArray = itemArray[d].flags.children;
			var parentRef = itemArray[d].flags.origin;
			var itemArray = await this.childLoop(itemArray,childArray,actorLevel,parentRef);//add children nodes to array
			}
		}
		return itemArray;
		/*	actor.update({items: itemArray});//replace old array with new
		actor.render(false);*/
	}
	//IncarnateAutoLevel.actorLevelChangeBackground("3jdBpvfLaHDP4tUl");//en9pC1jSnBEJkqDw
	static async actorLevelChangeRace(actorID,itemArray){
		var actor = game.actors.get(actorID);
		var itemLen = itemArray.length;
		var actorLevel = actor.data.data.details.level.value;
		for (var d = 0;d<itemLen;d++){
			if (itemArray[d].type==="class"&&itemArray[d].flags.family==="race"){//if it finds a race
			var childArray = itemArray[d].flags.children;
			var parentRef = itemArray[d].flags.origin;
			var itemArray = await this.childLoop(itemArray,childArray,actorLevel,parentRef);//add children nodes to array
			}
		}
		itemLen = itemArray.length;//redefine item array length to include new nodes from step 1
		for (var d = 0;d<itemLen;d++){
			if (itemArray[d].type==="feat"&&itemArray[d].flags.family==="race"&&itemArray[d].flags.children.length>1){//if it finds a race feature with children
				var childArray = itemArray[d].flags.children;
				var parentRef = [itemArray[d].flags.origin];
				var itemArray = await this.childLoop(itemArray,childArray,actorLevel,parentRef," - "+parentRef[0].name);//add children nodes to array
				if (itemArray.length !== itemLen){//checks to see if loop size changed
					if (itemArray.length > itemLen){//compensates for loop size change
						itemLen = itemArray.length;
					}else if (itemArray.length < itemLen){
						d = d - itemLen + itemArray.length;
						itemLen = itemArray.length;
					}
				}
			}
		}
		return itemArray;
	}
	//actorLevelChangeRace("3jdBpvfLaHDP4tUl");
	static async actorLevelChangeClass(actorID,itemArray){
		var actor = game.actors.get(actorID);
		for (var d = 0;d<itemArray.length;d++){
			if (itemArray[d].type==="class"&&itemArray[d].flags.family==="class"){//if it finds a class
			var childArray = itemArray[d].flags.children;
			var parentRef = itemArray[d].flags.origin;
			var classLevel = itemArray[d].data.levels.value;
			//				console.log("class level",classLevel);
			var itemArray = await this.childLoop(itemArray,childArray,classLevel,parentRef);//add children nodes to array
			}
		}
		const itemLen = itemArray.length;//redefine item array length to include new nodes from step 1
		for (var d = 0;d<itemLen;d++){
			if (itemArray[d].type==="feat"&&itemArray[d].flags.family==="class"&&itemArray[d].flags.children.length>1){//if it finds a race feature with children
				var parentRef = itemArray[d].flags.origin;
				//need to define level based off of parent nodes level
				var childArray = itemArray[d].flags.children;
				var itemArray = await this.childLoop(itemArray,childArray,classLevel,parentRef);//add children nodes to array
			}
		}
		return itemArray;
		/*	actor.update({items: itemArray});
		actor.render(false);*/
		}//actorLevelChangeClass("3jdBpvfLaHDP4tUl");
	static actorResourceUpdate (actorID,itemArray,actorLevel){
		var actor = game.actors.get(actorID);
		var resourceArray = JSON.parse(JSON.stringify(actor.data.data.resources));
		var spellsArray = JSON.parse(JSON.stringify(actor.data.data.spells));
		var actorSpellcasting = JSON.parse(JSON.stringify(actor.data.data.attributes.spellcasting));
		var spellcasting = 0, pactMagic = 0, runecrafting = 0;
		var resourceFilling = 1;
		var resourceOptions = [];
		var itemLen = itemArray.length;
		var spellcastingAbility = "";
		for (var g=0;g<itemLen;g++){
			if (itemArray[g].type==="class"&&itemArray[g].flags.family==="class"){//if it finds a class
				var classLevel = itemArray[g].data.levels.value;
				if (itemArray[g].flags.casting !== undefined){
					if (itemArray[g].flags.casting.spellType ==="spellcasting"){
						spellcasting += (classLevel*itemArray[g].flags.casting.spellpotency);
						console.log (itemArray[g].name+" brings spellcasting potency to "+spellcasting);
					}else if(itemArray[g].flags.casting.spellType==="runecrafting"){
						spellcasting += (classLevel*itemArray[g].flags.casting.spellpotency);
						console.log (itemArray[g].name+" brings spellcasting potency to "+spellcasting);
					}else if(itemArray[g].flags.casting.spellType==="pact"){
						pactMagic += (classLevel*itemArray[g].flags.casting.spellpotency);
						console.log (itemArray[g].name+" brings pactMagic potency to "+pactMagic);
					}
					if (spellcastingAbility === ""){
						spellcastingAbility = itemArray[g].flags.casting.ability;
						if (actorSpellcasting.value === ""){
							actorSpellcasting.value = spellcastingAbility;
						}
					}
				}
			}else if (itemArray[g].type==="feat"){
				if (itemArray[g].flags.resources!=undefined){
					if (itemArray[g].flags.parents != null){
						var itemParents = itemArray[g].flags.parents;
						if (itemArray[g].flags.family==="race"){
							if (actorLevel !== undefined){
								var itemLevel = actorLevel;
							}else {
								var itemLevel = actor.data.data.details.level.value;
							}
						}else if (itemArray[g].flags.family==="class"){
							var itemLevel = IncarnateAutoLevel.findParentLevel(itemArray,itemParents);
						}else{
							var itemLevel = 1;
						}
						var resourceOpt = itemArray[g].flags.resources;//resource array
						var resourceOptLen = resourceOpt.length;
						for (var h=0;h<resourceOptLen;h++){
							var resourceValues = resourceOpt[h].value;//value array
							var resourceValLen = resourceValues.length;
							for (var i=0;i<resourceValLen;i++){
								var resourceValue = resourceValues[i];//value object
								if (resourceValues[i].startLevel <= itemLevel && resourceValues[i].endLevel >= itemLevel){
									if(resourceValues[i].ability !== undefined){
										if (resourceValues[i].ability === "strength"){
											var resourceAbility = this.incarnateStatConvert (actor.data.data.abilities.str.value);
										} else if (resourceValues[i].ability === "dexterity"){
											var resourceAbility = this.incarnateStatConvert (actor.data.data.abilities.dex.value);
										} else if (resourceValues[i].ability === "constitution"){
											var resourceAbility = this.incarnateStatConvert (actor.data.data.abilities.con.value);
										} else if (resourceValues[i].ability === "intelligence"){
											var resourceAbility = this.incarnateStatConvert (actor.data.data.abilities.int.value);
										} else if (resourceValues[i].ability === "wisdom"){
											var resourceAbility = this.incarnateStatConvert (actor.data.data.abilities.wis.value);
										} else if (resourceValues[i].ability === "charisma"){
											var resourceAbility = this.incarnateStatConvert (actor.data.data.abilities.cha.value);
										} else if (resourceValues[i].ability === "default"){
											var resourceAbility = this.incarnateStatConvert (actor.data.data.abilities[actor.data.attributes.spellcasting.value].value);
										} else {
											var resourceAbility = 0;
										}
										resourceOptions.push({
											label:resourceOpt[h].label,
											lr:resourceValues[i].longRest,
											max:resourceValues[i].value+resourceAbility,
											sr:resourceValues[i].shortRest,
											type:"String",
											value:resourceValues[i].value+resourceAbility,
										});
										if (resourceValues[i].shortRest === true){
											itemArray[g].data.uses = {
												type:"sr",
												value:resourceValues[i].value+resourceAbility,
												max:resourceValues[i].value+resourceAbility
											}
										} else if (resourceValues[i].longRest === true){
											itemArray[g].data.uses = {
												type:"lr",
												value:resourceValues[i].value+resourceAbility,
												max:resourceValues[i].value+resourceAbility
											}
										} else {
											itemArray[g].data.uses = {
												type:"day",
												value:resourceValues[i].value+resourceAbility,
												max:resourceValues[i].value+resourceAbility
											}
										}
									}else if (resourceValues[i].classMult !== undefined){
										resourceOptions.push({
											label:resourceOpt[h].label,
											lr:resourceValues[i].longRest,
											max:resourceValues[i].value*itemLevel,
											sr:resourceValues[i].shortRest,
											type:"String",
											value:resourceValues[i].value*itemLevel
										});
										if (resourceValues[i].shortRest === true){
											itemArray[g].data.uses = {
												type:"sr",
												value:resourceValues[i].value*itemLevel,
												max:resourceValues[i].value*itemLevel
											}
										} else if (resourceValues[i].longRest === true){
											itemArray[g].data.uses = {
												type:"lr",
												value:resourceValues[i].value*itemLevel,
												max:resourceValues[i].value*itemLevel
											}
										} else {
											itemArray[g].data.uses = {
												type:"day",
												value:resourceValues[i].value*itemLevel,
												max:resourceValues[i].value*itemLevel
											}
										}
									}else{
										resourceOptions.push({
											label:resourceOpt[h].label,
											lr:resourceValues[i].longRest,
											max:resourceValues[i].value,
											sr:resourceValues[i].shortRest,
											type:"String",
											value:resourceValues[i].value
										});
										if (resourceValues[i].shortRest === true){
											itemArray[g].data.uses = {
												type:"sr",
												value:resourceValues[i].value,
												max:resourceValues[i].value
											}
										} else if (resourceValues[i].longRest === true){
											itemArray[g].data.uses = {
												type:"lr",
												value:resourceValues[i].value,
												max:resourceValues[i].value
											}
										} else {
											itemArray[g].data.uses = {
												type:"day",
												value:resourceValues[i].value,
												max:resourceValues[i].value
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
		console.log("Spellcasting: "+spellcasting+" Pact Magic: "+pactMagic);
		if (actor.data.data.attributes.spellcasting.value ===""){
			actor.data.data.attributes.spellcasting.value = spellcastingAbility;
		}
		if (spellcasting < 1){
			spellsArray.spell1.value=0;
			spellsArray.spell1.max=0;
		}else if (spellcasting >=1&&spellcasting<2){
			spellsArray.spell1.value=2;
			spellsArray.spell1.max=2;
		}else if (spellcasting >=2&&spellcasting<3){
			spellsArray.spell1.value=3;
			spellsArray.spell1.max=3;
		}else if (spellcasting >=3){
			spellsArray.spell1.value=4;
			spellsArray.spell1.max=4;
		}
		if (spellcasting < 3){
			spellsArray.spell2.value=0;
			spellsArray.spell2.max=0;
		}else if (spellcasting >=3 && spellcasting < 4){
			spellsArray.spell2.value=2;
			spellsArray.spell2.max=2;
		}else if (spellcasting >=4 && spellcasting < 24){
			spellsArray.spell2.value=3;
			spellsArray.spell2.max=3;
		}else if (spellcasting >=24){
			spellsArray.spell2.value=4;
			spellsArray.spell2.max=4;
		}
		if (spellcasting < 5){
			spellsArray.spell3.value=0;
			spellsArray.spell3.max=0;
		}else if (spellcasting >=5 && spellcasting < 6){
			spellsArray.spell3.value=2;
			spellsArray.spell3.max=2;
		}else if (spellcasting >=6 && spellcasting < 24){
			spellsArray.spell3.value=3;
			spellsArray.spell3.max=3;
		}else if (spellcasting >=24){
			spellsArray.spell3.value=4;
			spellsArray.spell3.max=4;
		}
		if (spellcasting < 7){
			spellsArray.spell4.value=0;
			spellsArray.spell4.max=0;
		}else if (spellcasting >=7 && spellcasting < 8){
			spellsArray.spell4.value=1;
			spellsArray.spell4.max=1;
		}else if (spellcasting >=8 && spellcasting < 9){
			spellsArray.spell4.value=2;
			spellsArray.spell4.max=2;
		}else if (spellcasting >=9 && spellcasting < 26){
			spellsArray.spell4.value=3;
			spellsArray.spell4.max=3;
		}else if (spellcasting >=26){
			spellsArray.spell4.value=4;
			spellsArray.spell4.max=4;
		}
		if (spellcasting < 9){
			spellsArray.spell5.value=0;
			spellsArray.spell5.max=0;
		}else if (spellcasting >=9 && spellcasting < 10){
			spellsArray.spell5.value=1;
			spellsArray.spell5.max=1;
		}else if (spellcasting >=10 && spellcasting < 18){
			spellsArray.spell5.value=2;
			spellsArray.spell5.max=2;
		}else if (spellcasting >=18 && spellcasting < 26){
			spellsArray.spell5.value=3;
			spellsArray.spell5.max=3;
		}else if (spellcasting >=26){
			spellsArray.spell5.value=4;
			spellsArray.spell5.max=4;
		}
		if (spellcasting >= 11){
			if (spellcasting >=11 && spellcasting < 19){
				spellsArray.spell6.value=1;
				spellsArray.spell6.max=1;
			}else if (spellcasting >=19 && spellcasting < 22){
				spellsArray.spell6.value=2;
				spellsArray.spell6.max=2;
			}else if (spellcasting >=22 && spellcasting < 28){
				spellsArray.spell6.value=3;
				spellsArray.spell6.max=3;
			}else if (spellcasting >=28){
				spellsArray.spell6.value=4;
				spellsArray.spell6.max=4;
			}
			if (spellcasting < 13){
				spellsArray.spell7.value=0;
				spellsArray.spell7.max=0;
			}else if (spellcasting >=13 && spellcasting < 20){
				spellsArray.spell7.value=1;
				spellsArray.spell7.max=1;
			}else if (spellcasting >=20 && spellcasting < 30){
				spellsArray.spell7.value=2;
				spellsArray.spell7.max=2;
			}else if (spellcasting >=30 && spellcasting < 32){
				spellsArray.spell7.value=3;
				spellsArray.spell7.max=3;
			}else if (spellcasting >=32){
				spellsArray.spell7.value=4;
				spellsArray.spell7.max=4;
			}
			if (spellcasting < 15){
				spellsArray.spell8.value=0;
				spellsArray.spell8.max=0;
			}else if (spellcasting >=15 && spellcasting < 23){
				spellsArray.spell8.value=1;
				spellsArray.spell8.max=1;
			}else if (spellcasting >=23 && spellcasting < 34){
				spellsArray.spell8.value=2;
				spellsArray.spell8.max=2;
			}else if (spellcasting >=34 && spellcasting < 38){
				spellsArray.spell8.value=3;
				spellsArray.spell8.max=3;
			}else if (spellcasting >=38){
				spellsArray.spell8.value=4;
				spellsArray.spell8.max=4;
			}
			if (spellcasting < 17){
				spellsArray.spell9.value=0;
				spellsArray.spell9.max=0;
			}else if (spellcasting >=17 && spellcasting < 21){
				spellsArray.spell9.value=1;
				spellsArray.spell9.max=1;
			}else if (spellcasting >=21 && spellcasting < 25){
				spellsArray.spell9.value=2;
				spellsArray.spell9.max=2;
			}else if (spellcasting >=25 && spellcasting < 27){
				spellsArray.spell9.value=3;
				spellsArray.spell9.max=3;
			}else if (spellcasting >=27 && spellcasting < 29){
				spellsArray.spell9.value=4;
				spellsArray.spell9.max=4;
			}else if (spellcasting >=29 && spellcasting < 31){
				spellsArray.spell9.value=5;
				spellsArray.spell9.max=5
			}else if (spellcasting >=31 && spellcasting < 33){
				spellsArray.spell9.value=6;
				spellsArray.spell9.max=6;
			}else if (spellcasting >=33 && spellcasting < 35){
				spellsArray.spell9.value=7;
				spellsArray.spell9.max=7;
			}else if (spellcasting >=35 && spellcasting < 36){
				spellsArray.spell9.value=8;
				spellsArray.spell9.max=8;
			}else if (spellcasting >=36 && spellcasting < 37){
				spellsArray.spell9.value=9;
				spellsArray.spell9.max=9;
			}else if (spellcasting >=37 && spellcasting < 39){
				spellsArray.spell9.value=10;
				spellsArray.spell9.max=10;
			}else if (spellcasting >=39 && spellcasting < 40){
				spellsArray.spell9.value=11;
				spellsArray.spell9.max=11;
			}else if (spellcasting >=40 && spellcasting < 41){
				spellsArray.spell9.value=13;
				spellsArray.spell9.max=13;
			}else if (spellcasting >=41 && spellcasting < 42){
				spellsArray.spell9.value=14;
				spellsArray.spell9.max=14;
			}else if (spellcasting >=42 && spellcasting < 43){
				spellsArray.spell9.value=15;
				spellsArray.spell9.max=15;
			}else if (spellcasting >=43 && spellcasting < 44){
				spellsArray.spell9.value=16;
				spellsArray.spell9.max=16;
			}else if (spellcasting >=44 && spellcasting < 45){
				spellsArray.spell9.value=17;
				spellsArray.spell9.max=17;
			}else if (spellcasting >=45 && spellcasting < 46){
				spellsArray.spell9.value=18;
				spellsArray.spell9.max=18;
			}else if (spellcasting >=46 && spellcasting < 47){
				spellsArray.spell9.value=19;
				spellsArray.spell9.max=19;
			}else if (spellcasting >=47 && spellcasting < 48){
				spellsArray.spell9.value=20;
				spellsArray.spell9.max=20;
			}else if (spellcasting >=48 && spellcasting < 49){
				spellsArray.spell9.value=21;
				spellsArray.spell9.max=21;
			}else if (spellcasting >=49 && spellcasting < 50){
				spellsArray.spell9.value=22;
				spellsArray.spell9.max=22;
			}else if (spellcasting >=50){
				spellsArray.spell9.value=23;
				spellsArray.spell9.max=23;
			}
		}else{
			spellsArray.spell6.value=0;
			spellsArray.spell6.max=0;
			spellsArray.spell7.value=0;
			spellsArray.spell7.max=0;
			spellsArray.spell8.value=0;
			spellsArray.spell8.max=0;
			spellsArray.spell9.value=0;
			spellsArray.spell9.max=0;
		}
		if (pactMagic>=1){
			resourceFilling++;
			var pactSlots = 0;
			if (pactMagic>=1&&pactMagic<2){
				pactSlots = 1
			}else if (pactMagic>=2&&pactMagic<11){
				pactSlots = 2
			}else if (pactMagic>=11&&pactMagic<18){
				pactSlots = 3
			}else if (pactMagic>=18&&pactMagic<21){
				pactSlots = 4
			}else if (pactMagic>=22&&pactMagic<27){
				pactSlots = 5
			}else if (pactMagic>=27&&pactMagic<33){
				pactSlots = 6
			}else if (pactMagic>=33&&pactMagic<39){
				pactSlots = 7
			}else if (pactMagic>=39&&pactMagic<45){
				pactSlots = 8
			}else if (pactMagic>=49){
				pactSlots = 9
			}
			resourceArray.primary = {
				label:"Pact Magic",
				lr:true,
				max:pactSlots,
				sr:true,
				type:"String",
				value:pactSlots
			};
		}
		resourceArray.others=[];
		var resourceOptionsLen = resourceOptions.length;
		for (var a=0;a<resourceOptionsLen;a++){
			if (resourceFilling >2){
				resourceArray.others.push(resourceOptions[a]);
			}else if(resourceFilling === 1){
				resourceFilling++;
				resourceArray.primary = {
					label:resourceOptions[a].label,
					lr:resourceOptions[a].lr,
					max:resourceOptions[a].value,
					sr:resourceOptions[a].sr,
					type:"String",
					value:resourceOptions[a].value
				};
			}else if(resourceFilling === 2){
				resourceFilling++;
				resourceArray.secondary = {
					label:resourceOptions[a].label,
					lr:resourceOptions[a].lr,
					max:resourceOptions[a].value,
					sr:resourceOptions[a].sr,
					type:"String",
					value:resourceOptions[a].value
				};
			}
		}
		const ac = game.settings.get("incarnateFiveEMod","autoAc") ? IncarnateAutoLevel.calculateAc(itemArray,actor) : 10;
		if (actorLevel !== undefined){
			actor.update(
				{
					data:{
						attributes:{
							spellcasting:actorSpellcasting,
							ac:{value:ac}
						},
						details:{level:{value:actorLevel}},
						resources:resourceArray,
						spells:spellsArray
					},
					items:itemArray
				}
			);
		}else{
			actor.update(
				{
					data:{
						attributes:{
							spellcasting:actorSpellcasting,
							ac:{value:ac}
						},
						resources:resourceArray,
						spells:spellsArray
					},
					items:itemArray
				}
			)
		}
		actor.render(false);
	}
	static acValueArray(formula,actor){
		var value=0;
		if (formula.base > 0) value = Number(formula.base);
		if (formula.abilities !== undefined){
			formula.abilities.forEach(ability =>{
				const tempValue = Number(actor.data.data.abilities[ability.ability] !== undefined ? actor.data.data.abilities[ability.ability].mod : 0);
				if (ability.max !== undefined && ability.max < tempValue){
					value += Number(ability.max);
				}else{
					value += Number(tempValue);
				}
			});
		}
		return Number(value);
	}
	static calculateAc(itemArray,actor){
		const acItems = itemArray.filter(item => item.flags.ac !== undefined);
		const acFormulaItems = acItems.filter(item => item.flags.ac.formula !== undefined && (item.flags.ac.formula.base > 0 || (item.flags.ac.formula.abilities !== undefined && item.flags.ac.formula.abilities.length > 0)) && (item.data.equipped === undefined || item.data.equipped.value)), acFormulas = [];
		const acBoostItems = acItems.filter(item => item.flags.ac.boost !== undefined && (item.flags.ac.boost.base > 0 || (item.flags.ac.boost.abilities !== undefined && item.flags.ac.boost.abilities.length > 0)) && (item.data.equipped === undefined || item.data.equipped.value)), acBoosts=[];
		acFormulaItems.forEach(item =>{
			acFormulas.push(item.flags.ac.formula);
		});
		acBoostItems.forEach(item =>{
			acBoosts.push(item.flags.ac.boost);
		});
		acFormulas.push({
			base:10,
			abilities:[{ability:"dex"}]
		});
		var acFormulaResult = [], acBoostResult =[];
		acFormulas.forEach(formula =>{
			acFormulaResult.push(IncarnateAutoLevel.acValueArray(formula,actor));
		});
		acBoosts.forEach(boost =>{
			acBoostResult.push(IncarnateAutoLevel.acValueArray(boost,actor));
		});
		acBoostResult.push(0);
		acFormulaResult.sort((a,b) => {return b-a});
		const ac = acFormulaResult[0] + acBoostResult.reduce((a,b) => a+b);
		return ac;
	}
	static findParentLevel(itemArray,itemParents){
		var itemLen = itemArray.length;
		for (var h=0;h<itemLen;h++){
			var itemParLen = itemParents.length;
			for (var i=0;i<itemParLen;i++){
				if (itemArray[h].flags.origin !== undefined){
					if (itemArray[h].flags.origin._id === itemParents[i]._id){
						return itemArray[h].data.levels.value;
					}
				}
			}
		}
	}
	static incarnateStatConvert (score){
		return Math.floor((score - 10) / 2);
	}
	//actorResourceUpdate("3jdBpvfLaHDP4tUl");
	static async actorAudit(actorID){
		var actor = game.actors.get(actorID);
		var itemArray = Array.from(actor.data.items);
		var itemArrayLen = itemArray.length;
		for (var a=itemArrayLen-1;a>-1;a--){//for each item
			if (itemArray[a].flags.parents!=null){//if it has a parent node
				var parents = itemArray[a].flags.parents;
				var parentIDs = [];
				var parentLength = parents.length;
				for (var c=0;c<parentLength;c++){//collect all possible parents
					parentIDs.push(parents[c]._id);
				}
				var currentItemLen = itemArray.length;
				var found = false;
				for (var b=0;b<currentItemLen;b++){//on an item
					for(var d=0;d<parentLength;d++){//if any parent
						if (itemArray[b].flags.origin!== undefined){
							if (parentIDs[d]===itemArray[b].flags.origin._id){
							found = true;//protect asset
							}
						}
					}
				}
				if (found === false){//if not found
					itemArray.splice(a,1);//remove
				}
			}
		}
		//itemArray = itemArray.splice(a-1,1);
		itemArray = await this.actorLevelChangeBackground(actorID,itemArray);
		itemArray = await this.actorLevelChangeRace(actorID,itemArray);
		itemArray = await this.actorLevelChangeClass(actorID,itemArray);
		await this.actorResourceUpdate(actorID,itemArray);
		console.log("Actor Audit Completed: "+ actor.data.name);
	}//actorAudit("3jdBpvfLaHDP4tUl");
}
/**
*Advanced Compendium Listings
*/
class IncarnateCompendium extends Compendium {//class Compendium extends Application
	constructor(metadata, options) {
		super(options);
		this.metadata = metadata;
	}

	/* -------------------------------------------- */

	/**
	* Register event listeners for Compendium directories
	* @private
	*/
	activateListeners(html) {
		super.activateListeners(html);
		var htmlDom = $(html)[0];
		var cachedClass = this;
		//listener for changes to input
		var inputValues = htmlDom.getElementsByClassName("IncarnateLeftPane")[0].getElementsByTagName("input");
		var inputValueLen = inputValues.length;
		for (var a=0;a<inputValueLen;a++){
			inputValues[a].addEventListener("click",cachedClass.browserFilter);
		}
		// Search filtering
		htmlDom.getElementsByClassName("compendium-search")[0].getElementsByTagName("input")[0].addEventListener("keyup",ev => {
			let input = ev.currentTarget;
			this._searchTime = new Date();
			setTimeout(() => {
				if ( new Date() - this._searchTime > 250) cachedClass.browserFilter(ev);
			}, 251);
		});
		// Min|max filtering
		var minOccurances = htmlDom.getElementsByClassName("min");
		for (var a=0; a<minOccurances.length; a++){
			minOccurances[a].addEventListener("change",ev => {
				let input = ev.currentTarget;
				this._searchTime = new Date();
				setTimeout(() => {
					if ( new Date() - this._searchTime > 250) cachedClass.browserFilter(ev);
				}, 251);
			});
		}
		var maxOccurances = htmlDom.getElementsByClassName("max");
		for (var a=0; a<maxOccurances.length; a++){
			maxOccurances[a].addEventListener("change",ev => {
				let input = ev.currentTarget;
				this._searchTime = new Date();
				setTimeout(() => {
					if ( new Date() - this._searchTime > 250) cachedClass.browserFilter(ev);
				}, 251);
			});
		}
		//And|or filtering
		inputValues = htmlDom.getElementsByTagName("select");
		inputValueLen = inputValues.length;
		for (var a=0;a<inputValueLen;a++){
			inputValues[a].addEventListener("change",cachedClass.browserFilter);
		}
		//Drag All Dragging
		let dragAllHandler = ev => this._onDragAllStart(ev);
		html.find(".incarnateDragAll").each((i, h2) =>{
			h2.setAttribute("draggable",true);
			h2.addEventListener("dragstart",dragAllHandler,false);
		});
		
		// GM only actions below here
		if ( !game.user.isGM ) return;
	}

	/* -------------------------------------------- */

	/**
	* Assign the default options which are supported by the Compendium UI
	* @private
	*/
	static get defaultOptions() {
		const options = super.defaultOptions;
		options.width = 500;
		options.height = window.innerHeight - 100;
		options.top = 70;
		options.left = 120;
		options.resizable = true;
		return options;
	}
	/* ----------------------------------------- */
	//Triggered by preRenderCompendium after rendering a compendium it checks for previous settings, applies them, and filters
	static applyPreviousFilters(uiLocation,html){
		html = html._element[0];
		if (ui[uiLocation].values === undefined) return;
		const values = ui[uiLocation].values;
		for (var property in values){
			if (values[property].length > 0){
				if (typeof(values[property][0]) === "string"){
					var section = html.getElementsByClassName(property)[0];
					values[property].forEach(item =>{
						if (section.getElementsByClassName(item)[0] !== undefined){ 
						section.getElementsByClassName(item)[0].checked = true;
						}else {
							console.warn("Property: ",item, " not found from properties: ", values[property]);
						}
					});
				}else if (typeof(values[property][0]) ==="object"){
					var section = html.getElementsByClassName(property)[0];
					values[property].forEach(item =>{
						section.getElementsByClassName(Object.keys(item)[0])[0].value = item[Object.keys(item)[0]];
					});
				}
			}
		}
		if (uiLocation.match(/background/gi) !== null){
			IncarnateBackgroundBrowser.prototype.browserFilter({srcElement:html});
		}else if (uiLocation.match(/bestiary/gi) !== null){
			IncarnateBestiaryBrowser.prototype.browserFilter({srcElement:html});
		}else if (uiLocation.match(/class/gi) !== null){
			IncarnateClassBrowser.prototype.browserFilter({srcElement:html});
		}else if (uiLocation.match(/equipment/gi) !== null){
			IncarnateEquipmentBrowser.prototype.browserFilter({srcElement:html});
		}else if (uiLocation.match(/races/gi) !== null){
			IncarnateRacesBrowser.prototype.browserFilter({srcElement:html});
		}else if (uiLocation.match(/spell/gi) !== null){
			IncarnateSpellBrowser.prototype.browserFilter({srcElement:html});
		}
	}
	//test to see how long the compendium takes to load
	/*async _renderInner(data,options) {
	    console.time("Render")
	    let html = await renderTemplate(this.template, data);
	    if ( html === "" ) throw new Error(`No data was returned from template ${this.template}`);
	    console.timeEnd("Render");
	    return $(html);
	}*/
	/* ----------------------------------------- */
	_onDragAllStart(event){
		const pack=(this.metadata.package+"."+this.metadata.name);
		const li = event.srcElement.parentElement;
		var itemArray=[];
		[].forEach.call(li.getElementsByTagName("li"),item=>{
			if(item.style.display!=="none"){
				itemArray.push({
					type:"Item",
					pack:pack,
					id: item.getAttribute("data-entry-id")
				});
			}
		});
		event.dataTransfer.setData("text/plain", JSON.stringify(itemArray));
	}

	/* -------------------------------------------- */
	_onDragStart(event) {
		const li = this;
		var packName;
		if (li.parentElement.parentElement.parentElement.getAttribute("data-pack")!==null){
			packName = li.parentElement.parentElement.parentElement.getAttribute("data-pack");
		}else {
			console.warn("Error 1994: data-pack not found");
		}
		const pack = game.packs.find(p => p.collection === packName);
	
		// Get the pack
		if ( !pack ) {
			console.log("pack not found")
			event.preventDefault();
			return false;
		}

		// Set the transfer data
		event.dataTransfer.setData("text/plain", JSON.stringify({
			type: pack.entity,
			pack: pack.collection,
			id: li.getAttribute("data-entry-id")
		}));
	}
	static incarnateSearchFilter(search,spells,spellLen){
		if (search !==""){
			let rgx = new RegExp(search, "i");
			for (var a=0;a<spellLen;a++){
				let name = spells[a].getElementsByClassName('entry-name')[0].textContent;
				if (!name.match(rgx)){
					spells[a].style.display="none";
				}
			}
		}
		return spells;
	}
	static incarnateFilterResults(valueArray,searchClass,spells,spellLen){
		var valueLen = valueArray.length;
		if (valueArray.length>0){
			for (var b=0;b<spellLen;b++){
				var found = false;
				var content = spells[b].getElementsByClassName(searchClass)[0].value;
				for (var c=0;c<valueLen;c++){
					if (content.toLowerCase().includes(valueArray[c].toLowerCase())){
						found = true;
					}
				}
				if (found === false){
					spells[b].style.display="none";
				}
			}
		}
		return spells;
	}
	static incarnateFindValues(leftPane,className){
		const levelsSec = leftPane.getElementsByClassName(className)[0];
		var inputs = levelsSec.getElementsByTagName("input");
		var inputLen = inputs.length;
		var values = [];
		for (var a=0;a<inputLen;a++){
			if (inputs[a].checked ===true){
				values.push(inputs[a].value);
			}
		}
		return Promise.resolve({[className]:values});
	}
	static incarnateShowHide(elementClass){
		var targets = document.getElementsByClassName(elementClass);
		if (targets[0].style.display === "block"){
			targets[0].style.display = "none";
		}else{
			targets[0].style.display = "block";
		}
	}
	static incarnateFilterResultsStrict(valueArray,searchClass,spells,spellLen){
		var valueLen = valueArray.length;
		if (valueArray.length>0){
			for (var b=0;b<spellLen;b++){
				var found = false;
				var content = spells[b].getElementsByClassName(searchClass)[0].value;
				for (var c=0;c<valueLen;c++){
					if (content===valueArray[c]){
						found = true;
					}
				}
				if (found === false){
					spells[b].style.display="none";
				}
			}
		}
		return spells;
	}
	static incarnateFilterMinMax(valueArray,searchClass,spells,spellLen){
		var valueLen = valueArray.length;
		if (valueArray.length>0){
			for (var b=0;b<spellLen;b++){
				var found = false;
				var content = Number(spells[b].getElementsByClassName(searchClass)[0].value);
				if (content === ""){
				}else {
					if (valueArray[0].min!==undefined){
						if (content >= Number(valueArray[0].min)){
							if(valueArray[1]!==undefined){
								if(valueArray[1].max!==undefined){
									if (content <= Number(valueArray[1].max)){
										found = true;
									}
								}
							}else{
								found = true;
							}
						}
					}else if(valueArray[0]!==undefined){
						if(valueArray[0].max!==undefined){
							if (content <= Number(valueArray[0].max)){
								found = true;
							}
						}
					}
				}
				if (found === false){
					spells[b].style.display="none";
				}
			}
		}
		return spells;
	}
	static incarnateFindMinMaxValues(leftPane,className){
		const levelsSec = leftPane.getElementsByClassName(className)[0];
		var inputs = levelsSec.getElementsByTagName("input");
		var inputLen = inputs.length;
		var values = [];
		for (var a=0;a<inputLen;a++){
			var name = inputs[a].getAttribute("name");
			var value = inputs[a].value;
			if (value !== ""){
				values.push({[name]:value});
			}
		}
		return Promise.resolve({[className]:values});
	}
	static incarnateFilterAndOr(valueArray,searchClass,spells,spellLen,filterNode){
		if (valueArray.length>0){
			if (document.getElementsByClassName(filterNode)[0].getElementsByTagName("select")[0].value == "or"){
				spells = IncarnateCompendium.incarnateFilterResults(valueArray,searchClass,spells,spellLen);
			}else if (document.getElementsByClassName(filterNode)[0].getElementsByTagName("select")[0].value == "and"){
				spells = IncarnateCompendium.incarnateFilterAnd(valueArray,searchClass,spells,spellLen);
			}
		}
		return spells;
	}
	static incarnateFilterAnd(valueArray,searchClass,spells,spellLen){
		var valueLen = valueArray.length;
		if (valueArray.length>0){
			for (var b=0;b<spellLen;b++){
				var found = true;
				var content = spells[b].getElementsByClassName(searchClass)[0].value;
				for (var c=0;c<valueLen;c++){
					if (!content.includes(valueArray[c])){
						found = false;
					}
				}
				if (found === false){
					spells[b].style.display="none";
				}
			}
		}
		return spells;
	}
}

//incarnateShowHide("spellBroLevel");
class IncarnateSpellBrowser extends IncarnateCompendium {
	constructor(metadata, options) {
		super(options);
		this.metadata = metadata;
	}
	static get defaultOptions() {
		const options = super.defaultOptions;
		options.template = "modules/incarnateFiveEMod/templates/incarnateSpellBrowser.html";
		return options;
	}
	_onDragStart(event) {
		const li = this;
		var packName;
		if (li.parentElement.parentElement.parentElement.parentElement.getAttribute("data-pack")!==null){
			packName = li.parentElement.parentElement.parentElement.parentElement.getAttribute("data-pack");
		}else {
			console.warn("Error 1994: data-pack not found");
		}
		const pack = game.packs.find(p => p.collection === packName);
	
		// Get the pack
		if ( !pack ) {
			console.log("pack not found")
			event.preventDefault();
			return false;
		}

		// Set the transfer data
		event.dataTransfer.setData("text/plain", JSON.stringify({
			type: pack.entity,
			pack: pack.collection,
			id: li.getAttribute("data-entry-id")
		}));
	}
	/**
	* Register event listeners for Compendium directories
	* @private
	*/
	activateListeners(html) {
		super.activateListeners(html);
	}
	/* ----------------------------------------- */
	async getData() {
		var templateData = {};
		templateData.spells = await game.packs.find(p=>p.collection===this.metadata.package+"."+this.metadata.name).getContent();
		templateData.values = ui._incarnateSpellBrowser.values;
		templateData.metadata = this.metadata;
		return templateData;
	}
	async browserFilter(ev){
		const app = IncarnateReference.getClosestClass(ev.srcElement,"app");
		const leftPane = app.getElementsByClassName("IncarnateLeftPane")[0];
		var spells = app.getElementsByClassName("pack-content")[0].getElementsByTagName("li");
		var spellLen = spells.length;
		var values = {};
		const tempValues = await Promise.all([IncarnateCompendium.incarnateFindValues(leftPane,"spellBroLevel"),IncarnateCompendium.incarnateFindValues(leftPane,"spellBroCaster"),IncarnateCompendium.incarnateFindValues(leftPane,"spellBroOfficial"),IncarnateCompendium.incarnateFindValues(leftPane,"spellBroComponent"),IncarnateCompendium.incarnateFindValues(leftPane,"conBox"),IncarnateCompendium.incarnateFindValues(leftPane,"ritBox"),IncarnateCompendium.incarnateFindValues(leftPane,"spellBroSchool"),IncarnateCompendium.incarnateFindValues(leftPane,"spellBroDuration"),IncarnateCompendium.incarnateFindValues(leftPane,"spellBroCastingTime")])
		.then(function(tempValues){
			tempValues.forEach((value, i) =>{
				var key = Object.keys(value)[0];
				values[key] = tempValues[i][key];
			});
			ui._incarnateSpellBrowser.values=values;
			for (var b=0;b<spellLen;b++){
				spells[b].style.display="flex";
		//		spells[b].style.display="none";
			}
			spells = IncarnateCompendium.incarnateFilterResults(values.spellBroLevel,"level",spells,spellLen);
			spells = IncarnateCompendium.incarnateFilterResults(values.spellBroCaster,"caster",spells,spellLen);
			spells = IncarnateCompendium.incarnateFilterResults(values.spellBroOfficial,"official",spells,spellLen);
			spells = IncarnateCompendium.incarnateFilterResults(values.spellBroComponent,"components",spells,spellLen);
			spells = IncarnateCompendium.incarnateFilterResults(values.conBox,"concentration",spells,spellLen);
			spells = IncarnateCompendium.incarnateFilterResults(values.ritBox,"ritual",spells,spellLen);
			spells = IncarnateCompendium.incarnateFilterResults(values.spellBroSchool,"school",spells,spellLen);
			spells = IncarnateCompendium.incarnateFilterResults(values.spellBroDuration,"duration",spells,spellLen);
			spells = IncarnateCompendium.incarnateFilterResults(values.spellBroCastingTime,"castingTime",spells,spellLen);
			spells = IncarnateCompendium.incarnateSearchFilter(document.getElementsByName("searchSpells")[0].value,spells,spellLen);
		});
		return spells;
	}
}
class IncarnateBackgroundBrowser extends IncarnateCompendium {
	constructor(metadata, options) {
		super(options);
		this.metadata = metadata;
	}
	static get defaultOptions() {
		const options = super.defaultOptions;
		options.template = "modules/incarnateFiveEMod/templates/incarnateBackgroundBrowser.html";
		return options;
	}
	/**
	* Register event listeners for Compendium directories
	* @private
	*/
	activateListeners(html) {
	//	console.log(html);
		super.activateListeners(html);
	}
	/* ----------------------------------------- */
	async getData() {
		var templateData = {};
		templateData.backgrounds = await game.packs.find(p=>p.collection===this.metadata.package+"."+this.metadata.name).getContent();
		templateData.values = ui._incarnateBackgroundBrowser.values;
		templateData.metadata = this.metadata;
		templateData.config = CONFIG.DND5E;
		return templateData;
	}
	async browserFilter(ev){
		const app = IncarnateReference.getClosestClass(ev.srcElement,"app");
		const leftPane = app.getElementsByClassName("BackgroundLeftPane")[0];
		var background = app.getElementsByClassName("pack-content")[0].getElementsByTagName("li");
		var backgroundLen = background.length;
		var values ={};
		const tempValues = await Promise.all([IncarnateCompendium.incarnateFindValues(leftPane,"backgroundBroOfficial"),IncarnateCompendium.incarnateFindValues(leftPane,"backgroundBroType"),IncarnateCompendium.incarnateFindValues(leftPane,"backgroundBroLanguages"),IncarnateCompendium.incarnateFindValues(leftPane,"backgroundBroSkills"),IncarnateCompendium.incarnateFindValues(leftPane,"backgroundBroTools")])
		.then(function(tempValues){
			tempValues.forEach((value, i) =>{
				var key = Object.keys(value)[0];
				values[key] = tempValues[i][key];
			});
			ui._incarnateBackgroundBrowser.values=values;
			for (var b=0;b<backgroundLen;b++){
				background[b].style.display="flex";
			}
			background = IncarnateCompendium.incarnateFilterResults(values.backgroundBroOfficial,"backgroundOfficial",background,backgroundLen);
			background = IncarnateCompendium.incarnateFilterResults(values.backgroundBroType,"backgroundType",background,backgroundLen);
			background = IncarnateCompendium.incarnateFilterResults(values.backgroundBroLanguages,"backgroundLanguages",background,backgroundLen);
			background = IncarnateCompendium.incarnateFilterResults(values.backgroundBroSkills,"backgroundSkills",background,backgroundLen);
			background = IncarnateCompendium.incarnateFilterResults(values.backgroundBroTools,"backgroundTools",background,backgroundLen);
			background = IncarnateCompendium.incarnateSearchFilter(document.getElementsByName("backgroundSearch")[0].value,background,backgroundLen);
		});
		return background;
	}
}
class IncarnateBestiaryBrowser extends IncarnateCompendium {
	constructor(metadata, options) {
		super(options);
		this.metadata = metadata;
	}
	static get defaultOptions() {
		const options = super.defaultOptions;
		options.template = "modules/incarnateFiveEMod/templates/incarnateBestiaryBrowser.html";
		return options;
	}
	/**
	* Register event listeners for Compendium directories
	* @private
	*/
	activateListeners(html) {
		super.activateListeners(html);
		const htmlDom = $(html)[0];
		//listener to make tabs work
		let nav = $('.tabs[data-group="group1"]');
		new Tabs(nav, {
			initial: "tab1",
			callback: t => console.log("Tab ${t} was clicked")
		});
		if (!game.user.isGM) return false;
		//Create List of Beasts for Random Generation
		htmlDom.getElementsByClassName("randomEncounterTab")[0].addEventListener("click",IncarnateBestiaryBrowser.prototype.prepRandomEncounterData);
		htmlDom.getElementsByClassName("incarnateRandomEncounter")[0].addEventListener("click",this.randomEncounter);
		htmlDom.getElementsByClassName("incarnateRandomReset")[0].addEventListener("click",this.randomEncounterReset);
		// Make compendium entries draggable (withough JQuery)
		var lineItems = htmlDom.getElementsByClassName("incBestiaryList")[0].getElementsByTagName("li");
		var lineItemLen = lineItems.length;
		for (var a=0;a<lineItemLen;a++){
			lineItems[a].setAttribute("draggable",true);
			lineItems[a].addEventListener("dragstart",this._onDragStart,false);
		}

	}
	/* ----------------------------------------- */
	randomEncounterReset(ev){
		this.parentElement.parentElement.getElementsByClassName("randomEncounters")[0].innerHTML = null;
	}
	randomEncounter(ev){
		const minXP = this.parentElement.parentElement.getElementsByClassName("min")[0].value;
		const maxXP = this.parentElement.parentElement.getElementsByClassName("max")[0].value;
		const beasts = JSON.parse(this.parentElement.parentElement.getElementsByClassName("randomEncounterBeastList")[0].innerHTML);
		const numberOfEncounters = this.parentElement.parentElement.getElementsByClassName("quantity")[0].value;
		var packName;
		if (this.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.getAttribute("data-pack")!==null){
			packName = this.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.getAttribute("data-pack");
		}else {
			console.log("Error 1993: data-pack not found");
			return false;
		}
		for (var a=0; a<numberOfEncounters; a++){
			var thisEncounter=[];
			var currentXP = 0;
			var abort = false;
			do{
				var tempResult = IncarnateBestiaryBrowser.prototype.selectMonster(beasts,minXP,maxXP,currentXP);
				if (tempResult === false){
					abort = true;
					console.log("No selected npc with xp less than ",Number(maxXP)-Number(currentXP));
				}else{
					var quantity = Math.trunc((Number(maxXP)-Number(currentXP))/Number(tempResult.xp));
					currentXP+=(quantity*Number(tempResult.xp));
					tempResult.quantity=quantity;
					tempResult.pack=packName;
					thisEncounter.push(tempResult);
				}
			}while(currentXP<minXP && abort===false);
			var li = document.createElement("li");
			thisEncounter.forEach(beast => {
				li.innerHTML+="<p>"+beast.name+":"+beast.quantity+"</p>";
			});
			li.innerHTML = '<div class="beastNames">'+li.innerHTML+"</div><div class='encounterXp'><p>"+currentXP+"</p></div>";
			li.innerHTML += '<div class="dragContent" style="display:none">{"type":"Encounter","encounter":'+JSON.stringify(thisEncounter)+"}</div>";
			li.setAttribute("draggable",true);
			li.addEventListener("dragstart",IncarnateBestiaryBrowser.onDragEncounterStart);
			this.parentElement.parentElement.getElementsByClassName("randomEncounters")[0].appendChild(li);
		}
	}
	static onDragEncounterStart(ev){
		console.log(ev.srcElement.getElementsByClassName("dragContent")[0].innerHTML);
		ev.dataTransfer.setData("text/plain", ev.srcElement.getElementsByClassName("dragContent")[0].innerHTML);
	}
	selectMonster(beasts,min,max,current){
		const targetXP = Number(max)-Number(current);
		beasts = beasts.filter(beast=>Number(beast.xp)<=Number(targetXP));
		if (!beasts.length > 0){
			return false;
		}
		const randomBeast = Math.floor(Math.random()*beasts.length);
		const selectedBeast = beasts[randomBeast];
		return selectedBeast;
	}
	prepRandomEncounterData(ev){
		var beastArray =[];
		var beasts = ev.srcElement.parentElement.parentElement.getElementsByClassName("incBestiaryList")[0].getElementsByTagName("li");
		var count = 0;
		[].forEach.call(beasts,beast=>{
			if(beast.style.display !== "none"){
				const newBeast = {
					name: beast.getAttribute("data-name"),
					xp: beast.getAttribute("data-xp"),
					id: beast.getAttribute("data-entry-id")
				}
				if (newBeast.name=== null)console.log(beast,count);
				count++;
				beastArray.push(newBeast);
			}
		});
		ev.srcElement.parentElement.parentElement.getElementsByClassName("randomEncounterBeastList")[0].innerHTML = JSON.stringify(beastArray);
	}
	async getData() {
		var templateData = {};
		templateData.beasts = await game.packs.find(p=>p.collection===this.metadata.package+"."+this.metadata.name).getContent();
		templateData.values = ui._incarnateBestiaryBrowser.values;
		templateData.metadata = this.metadata;
		return templateData;
	}
	async _onDragStart(event) {
		const li = this;
		var packName;
		if (li.parentElement.parentElement.parentElement.parentElement.parentElement.getAttribute("data-pack")!==null){
			packName = li.parentElement.parentElement.parentElement.parentElement.parentElement.getAttribute("data-pack");
		}else {
			console.log("Error 1993: data-pack not found");
		}
		const pack = game.packs.find(p => p.collection === packName);

		// Get the pack
		if ( !pack ) {
			console.log("pack not found")
			event.preventDefault();
			return false;
		}

		// Set the transfer data
		event.dataTransfer.setData("text/plain", JSON.stringify({
			type: pack.entity,
			pack: pack.collection,
			id: li.getAttribute("data-entry-id")
		}));
	}
	async browserFilter(ev){
		const app = IncarnateReference.getClosestClass(ev.srcElement,"app");
		const leftPane = app.getElementsByClassName("bestiaryLeftPane")[0];
		var beasts = app.getElementsByClassName("pack-content")[0].getElementsByTagName("li");
		var beastLen = beasts.length;
		var values= {};
		const tempValues = await Promise.all([IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroLevel"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroAttackSave"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroOfficial"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroAuthor"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroFunction"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroLore"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroTerrain"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroVulnerability"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroResistance"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroPhysicalResistance"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroImmunity"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroPhysicalImmunity"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroConditionImmunity"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroType"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroSubtype"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroAlignment"),IncarnateCompendium.incarnateFindValues(leftPane,"bestiaryBroSize")])
		.then(function(tempValues){
			tempValues.forEach((value, i) =>{
				var key = Object.keys(value)[0];
				values[key] = tempValues[i][key];
			});
			ui._incarnateBestiaryBrowser.values=values;
			for (var b=0;b<beastLen;b++){
				beasts[b].style.display="flex";
		//		beasts[b].style.display="none";
			}
			beasts = IncarnateCompendium.incarnateFilterResultsStrict(values.bestiaryBroLevel,"beastiarCR",beasts,beastLen);
			beasts = IncarnateCompendium.incarnateFilterResults(values.bestiaryBroOfficial,"bestiaryOfficial",beasts,beastLen);
			beasts = IncarnateCompendium.incarnateFilterAndOr(values.bestiaryBroAttackSave,"bestiaryAttackSave",beasts,beastLen,"bestiaryBroAttackSave");
			beasts = IncarnateCompendium.incarnateFilterResults(values.bestiaryBroAuthor,"bestiaryAuthor",beasts,beastLen);
			beasts = IncarnateCompendium.incarnateFilterResults(values.bestiaryBroFunction,"bestiaryFunction",beasts,beastLen);
			beasts = IncarnateCompendium.incarnateFilterResults(values.bestiaryBroLore,"bestiaryLore",beasts,beastLen);
			beasts = IncarnateCompendium.incarnateFilterAndOr(values.bestiaryBroTerrain,"bestiaryTerrain",beasts,beastLen,"bestiaryBroTerrain");
			beasts = IncarnateCompendium.incarnateFilterAndOr(values.bestiaryBroVulnerability,"bestiaryVulnerability",beasts,beastLen,"bestiaryBroVulnerability");
			beasts = IncarnateCompendium.incarnateFilterAndOr(values.bestiaryBroResistance,"bestiaryResistance",beasts,beastLen,"bestiaryBroResistance");
			beasts = IncarnateCompendium.incarnateFilterResultsStrict(values.bestiaryBroPhysicalResistance,"bestiaryCustomResistance",beasts,beastLen);
			beasts = IncarnateCompendium.incarnateFilterAndOr(values.bestiaryBroImmunity,"bestiaryImmunity",beasts,beastLen,"bestiaryBroImmunity");
			beasts = IncarnateCompendium.incarnateFilterResultsStrict(values.bestiaryBroPhysicalImmunity,"bestiaryCustomImmunity",beasts,beastLen);
			beasts = IncarnateCompendium.incarnateFilterAndOr(values.bestiaryBroConditionImmunity,"bestiaryConditionImmunity",beasts,beastLen,"bestiaryBroConditionImmunity");
			beasts = IncarnateCompendium.incarnateFilterResults(values.bestiaryBroType,"bestiaryType",beasts,beastLen);
			beasts = IncarnateCompendium.incarnateFilterResults(values.bestiaryBroSubtype,"bestiarySubtype",beasts,beastLen);
			beasts = IncarnateCompendium.incarnateFilterResultsStrict(values.bestiaryBroAlignment,"bestiaryAlignment",beasts,beastLen);
			beasts = IncarnateCompendium.incarnateFilterResultsStrict(values.bestiaryBroSize,"bestiarySize",beasts,beastLen);
			beasts = IncarnateCompendium.incarnateSearchFilter(document.getElementsByName("bestiarySearch")[0].value,beasts,beastLen);
		});
		return beasts;
	}
}
class IncarnateClassBrowser extends IncarnateCompendium {
	constructor(metadata, options) {
		super(options);
		this.metadata = metadata;
	}
	static get defaultOptions() {
		const options = super.defaultOptions;
		options.template = "modules/incarnateFiveEMod/templates/incarnateClassBrowser.html";
		return options;
	}
	/**
	* Register event listeners for Compendium directories
	* @private
	*/
	activateListeners(html) {
		super.activateListeners(html);
	}
	/* ----------------------------------------- */
	async getData() {
		var templateData = {};
		templateData.incClasses = await game.packs.find(p=>p.collection===this.metadata.package+"."+this.metadata.name).getContent();
		templateData.values = ui._incarnateClassBrowser.values;
		templateData.metadata = this.metadata;
		return templateData;
	}
	async browserFilter(ev){
		const app = IncarnateReference.getClosestClass(ev.srcElement,"app");
		const leftPane = app.getElementsByClassName("incClassLeftPane")[0];
		var incClass = app.getElementsByClassName("pack-content")[0].getElementsByTagName("li");
		var incClassLen = incClass.length;
		var values={};
		const tempValues = await Promise.all([IncarnateCompendium.incarnateFindValues(leftPane,"incClassBroOfficial"),IncarnateCompendium.incarnateFindValues(leftPane,"incClassBroType"),IncarnateCompendium.incarnateFindValues(leftPane,"incClassBroClass"),IncarnateCompendium.incarnateFindValues(leftPane,"incClassPrimaryAbility"),IncarnateCompendium.incarnateFindValues(leftPane,"incClassSecondaryAbility")])
		.then(function(tempValues){
			tempValues.forEach((value, i) =>{
				var key = Object.keys(value)[0];
				values[key] = tempValues[i][key];
			});
			ui._incarnateClassBrowser.values=values;
			for (var b=0;b<incClassLen;b++){
				incClass[b].style.display="flex";
			}
			incClass = IncarnateCompendium.incarnateFilterResults(values.incClassBroOfficial,"incClassOfficial",incClass,incClassLen);
			incClass = IncarnateCompendium.incarnateFilterResultsStrict(values.incClassBroType,"incClassType",incClass,incClassLen);
			incClass = IncarnateCompendium.incarnateFilterResultsStrict(values.incClassBroClass,"incClassClass",incClass,incClassLen);
			incClass = IncarnateCompendium.incarnateFilterResultsStrict(values.incClassPrimaryAbility,"incClassStat1",incClass,incClassLen);
			incClass = IncarnateCompendium.incarnateFilterResultsStrict(values.incClassSecondaryAbility,"incClassStat2",incClass,incClassLen);
			incClass = IncarnateCompendium.incarnateSearchFilter(document.getElementsByName("incClassSearch")[0].value,incClass,incClassLen);
		});
		return incClass;
	}
}
class IncarnateEquipmentBrowser extends IncarnateCompendium {
	constructor(metadata, options) {
		super(options);
		this.metadata = metadata;
	}
	static get defaultOptions() {
		const options = super.defaultOptions;
		options.template = "modules/incarnateFiveEMod/templates/incarnateEquipmentBrowser.html";
		return options;
	}
	/**
	* Register event listeners for Compendium directories
	* @private
	*/
	activateListeners(html) {
		super.activateListeners(html);
	}
	/* ----------------------------------------- */
	async getData() {
		var templateData = {};
		templateData.equipments = await game.packs.find(p=>p.collection===this.metadata.package+"."+this.metadata.name).getContent();
		templateData.values = ui._incarnateEquipmentBrowser.values;
		templateData.metadata = this.metadata;
		return templateData;
	}
	async browserFilter(ev){
		const app = IncarnateReference.getClosestClass(ev.srcElement,"app");
		const leftPane = document.getElementsByClassName("equipmentLeftPane")[0];
		var equipment = app.getElementsByClassName("pack-content")[0].getElementsByTagName("li");
		var equipmentLen = equipment.length;
		var values= {};
		const tempValues = await Promise.all([IncarnateCompendium.incarnateFindValues(leftPane,"equipmentBroOfficial"),IncarnateCompendium.incarnateFindValues(leftPane,"equipmentBroType"),IncarnateCompendium.incarnateFindValues(leftPane,"equipmentBroSubtype"),IncarnateCompendium.incarnateFindValues(leftPane,"equipmentBroRarity"),IncarnateCompendium.incarnateFindValues(leftPane,"equipmentBroAttunement"),IncarnateCompendium.incarnateFindValues(leftPane,"equipmentBroPrereqs"),IncarnateCompendium.incarnateFindValues(leftPane,"equipmentBroMagic"),IncarnateCompendium.incarnateFindValues(leftPane,"equipmentBroMundane"),IncarnateCompendium.incarnateFindMinMaxValues(leftPane,"equipmentBroPrice"),IncarnateCompendium.incarnateFindValues(leftPane,"equipmentBroWeaponProp"),IncarnateCompendium.incarnateFindMinMaxValues(leftPane,"equipmentBroWeight"),IncarnateCompendium.incarnateFindMinMaxValues(leftPane,"equipmentBroRecommendedLevel"),IncarnateCompendium.incarnateFindValues(leftPane,"equipmentBroRecommendedGenre"),IncarnateCompendium.incarnateFindValues(leftPane,"equipmentBroConsumable")])
		.then(function(tempValues){
			tempValues.forEach((value, i) =>{
				var key = Object.keys(value)[0];
				values[key] = tempValues[i][key];
			});
			ui._incarnateEquipmentBrowser.values=values;
			for (var b=0;b<equipmentLen;b++){
				equipment[b].style.display="flex";
			}
			equipment = IncarnateCompendium.incarnateFilterResults(values.equipmentBroOfficial,"equipmentOfficial",equipment,equipmentLen);
			equipment = IncarnateCompendium.incarnateFilterResults(values.equipmentBroType,"equipmentType",equipment,equipmentLen);
			equipment = IncarnateCompendium.incarnateFilterResults(values.equipmentBroSubtype,"equipmentSubtype",equipment,equipmentLen);
			equipment = IncarnateCompendium.incarnateFilterResults(values.equipmentBroRarity,"equipmentRarity",equipment,equipmentLen);
			equipment = IncarnateCompendium.incarnateFilterResults(values.equipmentBroAttunement,"equipmentAttune",equipment,equipmentLen);
			equipment = IncarnateCompendium.incarnateFilterResults(values.equipmentBroPrereqs,"equipmentPrereq",equipment,equipmentLen);
			equipment = IncarnateCompendium.incarnateFilterResults(values.equipmentBroMagic,"equipmentMagical",equipment,equipmentLen);
			equipment = IncarnateCompendium.incarnateFilterResults(values.equipmentBroMundane,"equipmentMundane",equipment,equipmentLen);
			equipment = IncarnateCompendium.incarnateFilterMinMax(values.equipmentBroPrice,"equipmentPrice",equipment,equipmentLen);
			equipment = IncarnateCompendium.incarnateFilterAndOr(values.equipmentBroWeaponProp,"equipmentProperties",equipment,equipmentLen,"equipmentBroWeaponProp");
			equipment = IncarnateCompendium.incarnateFilterMinMax(values.equipmentBroWeight,"equipmentWeight",equipment,equipmentLen);
			equipment = IncarnateCompendium.incarnateFilterMinMax(values.equipmentBroRecommendedLevel,"equipmentRecommendedDropLevel",equipment,equipmentLen);
			equipment = IncarnateCompendium.incarnateFilterAndOr(values.equipmentBroRecommendedGenre,"equipmentRecommendedGenre",equipment,equipmentLen,"equipmentBroRecommendedGenre");
			equipment = IncarnateCompendium.incarnateFilterResults(values.equipmentBroConsumable,"equipmentItemConsumable",equipment,equipmentLen);
			equipment = IncarnateCompendium.incarnateSearchFilter(document.getElementsByName("equipmentSearch")[0].value,equipment,equipmentLen);
		});
		return equipment;
	}
}
class IncarnateRacesBrowser extends IncarnateCompendium {
	constructor(metadata, options) {
		super(options);
		this.metadata = metadata;
	}
	static get defaultOptions() {
		const options = super.defaultOptions;
		options.template = "modules/incarnateFiveEMod/templates/incarnateRaceBrowser.html";
		return options;
	}
	/**
	* Register event listeners for Compendium directories
	* @private
	*/
	activateListeners(html) {
		super.activateListeners(html);
	}
	/* ----------------------------------------- */
	async getData() {
		var templateData = {};
		templateData.incRaces = await game.packs.find(p=>p.collection===this.metadata.package+"."+this.metadata.name).getContent();
		templateData.values = ui._incarnateRacesBrowser.values;
		templateData.metadata = this.metadata;
		return templateData;
	}
	async browserFilter(ev){
		const app = IncarnateReference.getClosestClass(ev.srcElement,"app");
		const leftPane = app.getElementsByClassName("incRaceLeftPane")[0];
		var incRace = app.getElementsByClassName("pack-content")[0].getElementsByTagName("li");
		var incRaceLen = incRace.length;
		var values = {};
		const tempValues = await Promise.all([IncarnateCompendium.incarnateFindValues(leftPane,"incRaceBroOfficial"),IncarnateCompendium.incarnateFindValues(leftPane,"incRaceBroLanguages"),IncarnateCompendium.incarnateFindValues(leftPane,"incRaceBroSpellcasting"),IncarnateCompendium.incarnateFindValues(leftPane,"incRaceAbility2"),IncarnateCompendium.incarnateFindValues(leftPane,"incRaceAbility1"),IncarnateCompendium.incarnateFindValues(leftPane,"incRaceBroType"),IncarnateCompendium.incarnateFindValues(leftPane,"incBroRaceDarkvision")])
		.then(function(tempValues){
			tempValues.forEach((value, i) =>{
				var key = Object.keys(value)[0];
				values[key] = tempValues[i][key];
			});
			ui._incarnateRacesBrowser.values=values;
			for (var b=0;b<incRaceLen;b++){
				incRace[b].style.display="flex";
			}
			incRace = IncarnateCompendium.incarnateFilterResults(values.incRaceBroOfficial,"incRaceOfficial",incRace,incRaceLen);
			incRace = IncarnateCompendium.incarnateFilterResults(values.incRaceBroLanguages,"incRaceLanguages",incRace,incRaceLen);
			incRace = IncarnateCompendium.incarnateFilterResults(values.incRaceBroSpellcasting,"incRaceInnate",incRace,incRaceLen);
			incRace = IncarnateCompendium.incarnateFilterAndOr(values.incRaceAbility2,"incRaceStat",incRace,incRaceLen,"incRaceAbility2");
			incRace = IncarnateCompendium.incarnateFilterAndOr(values.incRaceAbility1,"incRaceStat",incRace,incRaceLen,"incRaceAbility1");
			incRace = IncarnateCompendium.incarnateFilterResultsStrict(values.incRaceBroType,"incRaceType",incRace,incRaceLen);
			incRace = IncarnateCompendium.incarnateFilterResultsStrict(values.incBroRaceDarkvision,"incRaceDarkvision",incRace,incRaceLen);
			incRace = IncarnateCompendium.incarnateSearchFilter(document.getElementsByName("incRaceSearch")[0].value,incRace,incRaceLen);
		});
		return incRace;
	}
}
class IncarnateItemParcelSheet extends ActorSheet {
	static get defaultOptions() {
		let config = CONFIG.DND5E[this.name] || {};
		return {
			width: 400,
			height: 450,
			top: null,
			left: null,
			popOut: true,
			minimizable: true,
			id: "",
			classes: ["dnd5e", "itemParcel","sheet"],
			title: "",
			template: config.template,
			resizable:true,
			liveUpdate:true
		};
	};


	/**
	* Handle unfocusing an input on form - maybe trigger an update if ``options.liveUpdate`` has been set to true
	* @param event {Event}   The initial triggering event
	* @private
	*/
	_onUnfocus(event) {
		this._submitting = true;
		setTimeout(() => {
			let hasFocus = $(":focus").length;
			if ( !hasFocus ){
				this._submitting = false;
				this._onSubmit(event);
			}
		}, 25);
	}

	/* -------------------------------------------- */

	/**
	* Get the correct HTML template path to use for rendering this particular sheet
	* @type {String}
	*/
	
	get template() {
		return "modules/incarnateFiveEMod/templates/incarnateItemParcel.html";
	}

	/* -------------------------------------------- */
	/**
	* Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
	*/
	getData() {
		var sheetData = super.getData();
		sheetData.compendiumData=this.options.compendium;
		// Return data for rendering
		return sheetData;
	}

	/* -------------------------------------------- */
	/**
	* Organize and classify Items for Character sheets
	* @private
	*/
	_prepareItems(actorData) {

		// Inventory
		const inventory = {
			weapon: { label: "Weapons", items: [] },
			equipment: { label: "Equipment", items: [] },
			consumable: { label: "Consumables", items: [] },
			tool: { label: "Tools", items: [] },
			backpack: { label: "Backpack", items: [] },
		};

		// Iterate through items, allocating to containers
		let totalWeight = 0;
		for ( let i of actorData.items ) {
			i.img = i.img || DEFAULT_TOKEN;

			// Inventory
			if ( Object.keys(inventory).includes(i.type) ) {
			i.data.quantity.value = i.data.quantity.value || 1;
			i.data.weight.value = i.data.weight.value || 0;
			i.totalWeight = Math.round(i.data.quantity.value * i.data.weight.value * 10) / 10;
			i.hasCharges = (i.type === "consumable") && i.data.charges.max > 0;
			inventory[i.type].items.push(i);
			totalWeight += i.totalWeight;
			}
		}

		// Assign and return
		actorData.inventory = inventory;
	}

	/* -------------------------------------------- */
	/*  Event Listeners and Handlers
	/* -------------------------------------------- */

	/**
	* Activate event listeners using the prepared sheet HTML
	* @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
	*/
	activateListeners(html) {
		super.activateListeners(html);

		//Drag All Dragging
		let dragAllHandler = ev => this._onDragAllStart(ev);
		html.find(".incarnateDragAll").each((i, h2) =>{
			h2.addEventListener("dragstart",dragAllHandler,false);
		});
		var dragAllNodes = document.getElementsByClassName("incarnateDragAll");
		
		// Everything below here is only needed if the sheet is editable
		if (!this.options.editable) return;

	}
	/* -------------------------------------------- */
	_onDragAllStart(event){
		const li = this;
		var pack,_id;
		if (li.object.data.flags.origin!==undefined){
			pack = li.object.data.flags.origin.pack;
			_id = li.object.data.flags.origin._id;
		}else{
			pack = event.srcElement.getAttribute("compendiumdata");
			_id = event.srcElement.getAttribute("_id");
		}
		event.dataTransfer.setData("text/plain", JSON.stringify({type:"itemPack",pack:pack,id:_id}));
	}
	/* -------------------------------------------- */
	async _onDrop(event) {
		event.preventDefault();
		// Try to extract the data
		let data;
		const preData = event.dataTransfer.getData("text/plain");
		const preDataCheck = await IncarnateReference.incarnateJSONcheck(preData);
		if (preDataCheck === true){
			data = JSON.parse(preData);
		}else{
			return false;
		}
		if (data.type ==="itemPack"){
			var itemParcel = await IncarnateReference.lookupActorComplete(data.id,data.pack);
			itemParcel = itemParcel[0];
			if (itemParcel === false){
				console.log("Actor: ",data.id," not found");
				return false;
			}
			const itemParcelItems = itemParcel.data.items;
			const itemParLen = itemParcelItems.length;
			var itemArray=[];
			for (var a=0;a<itemParLen;a++){
				itemArray.push({
					type:"Item" ,
					actorId:data.id,
					pack:data.pack,
					id:itemParcelItems[a].id
				})
			};
			data = itemArray;
		}
		if (data.length !== undefined){
			var dataLen = data.length;
			var startingItems = Array.from(this.actor.data.items);
			const startItemLen = startingItems.length;
			var itemId=1;
			var promises=[];
			for (var a=0;a<startItemLen;a++){
				if (startingItems[a].id>itemId){
					itemId=startingItems[a].id;
				}
			}
			for (var a=0;a<dataLen;a++){
				if ( data[a].type !== "Item" ){
				}else{
					var calledPacks = [];
					var calledActors = [];
					var newItem;
					if (data[a].actorId != undefined){
						itemId++;
						var actorFound = false;
						calledActors.forEach(async calledActor =>{
							if (calledActor.id === data[a].actorId){
								actorFound = true;
								newItem = await IncarnateAutoLevel.incarnateFormatItem(data[a].id,data[a].pack,itemId,undefined,data[a].actorId,calledActor.data);
							}
						});
						if (actorFound === false){
							var newActor = await IncarnateReference.lookupActorComplete(data[a].actorId,data[a].pack);
							calledActors.push({id:data[a].actorId,data:newActor});
							newItem = await IncarnateAutoLevel.incarnateFormatItem(data[a].id,data[a].pack,itemId,undefined,data[a].actorId,undefined,newActor);
						}
						if (newItem.type ==="spell"){
							newItem.data.prepared.value=false;
						}
						startingItems.push(newItem);
					}else if ( data[a].pack != undefined ){
						itemId++;
						var packFound = false;
						var calledPackLen = calledPacks.length;
						for (var c=0; c<calledPackLen; c++){
							if (calledPacks[c].name === data[a].pack){
								packFound = true;
								var newItem = await IncarnateAutoLevel.incarnateFormatItem(data[a].id,data[a].pack,itemId,undefined,undefined,undefined,calledPacks[c].content)
							}
						}
						if (packFound === false){
							const prePackContent = await IncarnateReference.incarnatePackFind(data[a].pack);
							const packContent = await prePackContent.getContent();
							calledPacks.push({name:data[a].pack,content:packContent});
							var newItem = await IncarnateAutoLevel.incarnateFormatItem(data[a].id,data[a].pack,itemId,undefined,undefined,undefined,packContent)
						}
						if (newItem.type ==="spell"){
							newItem.data.prepared.value=false;
						}
						startingItems.push(newItem);
					}else {
						itemId++;
						promises[a]=IncarnateAutoLevel.incarnateFormatItem(data[a].id,null,itemId)
						.then((result)=>{
							if (result.type ==="spell"){
								result.data.prepared.value=false;
							}
							startingItems.push(result);
						});
					}
				}
			}
			Promise.all(promises).then((result)=>{
				this.actor.update({items: startingItems});
			})
			.then((result)=>{
				this.actor.render(false);
			});
		}else{
			if ( data.type !== "Item" ) return;
			// From Compendium
			if ( data.pack ) {
				this.actor.importItemFromCollection(data.pack, data.id);
			}

			// From Actor
			else if ( data.actorId ) {
				if ( data.actorId === this.actor._id ) return false;
				let actor = game.actors.get(data.actorId),
				item = duplicate(actor.items.find(i => i.id === data.id));
				item.id = null;
				this.actor.createOwnedItem(item, true);
			}

			// From World
			else {
				let item = game.items.get(data.id);
				this.actor.createOwnedItem(item.data, true);
			}
		}
		return false;
	}
}
class IncarnateLootDistributionSheet extends IncarnateItemParcelSheet {
	static get defaultOptions() {
		let config = CONFIG.DND5E[this.name] || {};
		return {
			width: 450,
			height: 450,
			top: null,
			left: null,
			popOut: true,
			minimizable: true,
			id: "",
			classes: ["dnd5e","itemParcel", "distributionSheet","sheet"],
			title: "",
			template: config.template,
			resizable:true,
			liveUpdate:true
		};
	};


	/* -------------------------------------------- */

	/**
	* Get the correct HTML template path to use for rendering this particular sheet
	* @type {String}
	*/
	
	get template() {
		return "modules/incarnateFiveEMod/templates/incarnateLootDistribution.html";
	}

	/* -------------------------------------------- */
	addItem (ev){
		event.preventDefault();
		var actor = this.object;
		console.log(ev.srcElement,"this",this);
		new Dialog({
			title: `Add Item?`,
			content: "<p> What type of item do you wish to add?</p>",
			buttons: {
				backpack:{
					label: "Backpack",
					callback: ()=> {
						actor.createOwnedItem({name:"New Backpack", type:"backpack"}, {renderSheet: true});
					}
				},
				consumable:{
					label: "Consumable",
					callback: ()=> {
						actor.createOwnedItem({name:"New Consumable", type:"consumable"}, {renderSheet: true});
					}
				},
				equipment:{
					label: "Equipment",
					callback: ()=> {
						actor.createOwnedItem({name:"New Equipment", type:"equipment"}, {renderSheet: true});
					}
				},
				weapon:{
					label: "Weapon",
					callback: ()=> {
						actor.createOwnedItem({name:"New Weapon", type:"weapon"}, {renderSheet: true});
					}
				},
				tool:{
					label: "Tool",
					callback: ()=> {
						actor.createOwnedItem({name:"New Tool", type:"tool"}, {renderSheet: true});
					}
				}
			},
			default: "weapon"
		}).render(true);
	}
	async _onDrop(event) {
		const ifItem = await super._onDrop(event);
		if (ifItem===false){
			const preData = event.dataTransfer.getData("text/plain");
			if (preData.match(/^{\"type\":\"Actor\",\"id\":\"[a-zA-Z0-9]{16}\"}$/)!==null){
				console.log("Actor Found: ",preData);
				const data = JSON.parse(preData);
				var actor = game.actors.get(this.object._id);
				var flags = JSON.parse(JSON.stringify(actor.data.flags));
				var distActor =[];
				if (flags.distActor !== undefined){
					distActor = flags.distActor;
				}else{
					flags.distActor=[];
					distActor = flags.distActor;
				}
				var found=false;
				distActor.forEach(object=>{
					if (object.id === data.id){
						found = true;
					}
				});
				if (found === false){
					distActor.push({
						id: data.id,
						name: game.actors.get(data.id).name,
						currency: {
							pp:{label:"PP",value:0},
							gp:{label:"GP",value:0},
							ep:{label:"EP",value:0},
							sp:{label:"SP",value:0},
							cp:{label:"CP",value:0}
						}
					});
					actor.update({flags:flags});
					actor.render(false);
				}
			}else if(preData.match(/^{\"type\":\"DistActor\",\"id\":\"[0-9]+\"}$/)!==null){
				console.log("DistActor Found: ",preData);
				const data = JSON.parse(preData);
				const actor = this.object;
				var items = Array.from(actor.items);
				var distActor;
				if (event.srcElement.parentElement.parentElement.getAttribute("data-id") !== null){
					distActor = event.srcElement.parentElement.parentElement.getAttribute("data-id");
				}else if (event.srcElement.parentElement.parentElement.parentElement.getAttribute("data-id") !== null){
					distActor = event.srcElement.parentElement.parentElement.parentElement.getAttribute("data-id");
				}
				if (distActor === null){
					console.warn("Dist Actor not found",event.srcElement);
					return false;
				}
				items.forEach(item=>{
					if (item.id === Number(data.id)){
						item.flags.distribution = distActor;
					}
				});
				actor.update({items:items});
				actor.render(false);
			}else{
				return false;
			}
		}
	}
	async _onDropPlayer(event){
		event.preventDefault();
		const preData = event.dataTransfer.getData("text/plain");
		if(preData.match(/^{\"type\":\"DistActor\",\"id\":\"[0-9]+\"}$/)!==null){
			console.log("DistActor Found: ",preData);
			const data = JSON.parse(preData);
			const actor = this.object;
			var items = Array.from(actor.items);
			var distActor;
			if (event.srcElement.parentElement.parentElement.getAttribute("data-id") !== null){
				distActor = event.srcElement.parentElement.parentElement.getAttribute("data-id");
			}else if (event.srcElement.parentElement.parentElement.parentElement.getAttribute("data-id") !== null){
				distActor = event.srcElement.parentElement.parentElement.parentElement.getAttribute("data-id");
			}
			if (distActor === null){
				console.warn("Dist Actor not found",event.srcElement);
				return false;
			}
			items.forEach(item=>{
				if (item.id === Number(data.id)){
					item.flags.distribution = distActor;
				}
			});
			actor.update({items:items});
			actor.render(false);
		}else{
			return false;
		}
	}
	/**
	* Make dragging transfer a unique tag for DistActor to bypass normal _onDrop function result
	 */
	async _onDragItemStart(event){
		event.dataTransfer.setData("text/plain", JSON.stringify({
			type:"DistActor",
			id:event.srcElement.getAttribute("data-item-id")
		}));
	}
	/**
	* Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
	*/
	getData() {
		var sheetData = super.getData();
		// Prepare owned items
		sheetData.compendiumData=this.options.compendium;
		// Return data for rendering
		console.log("sheetData",sheetData);
		return sheetData;
	}

	/* -------------------------------------------- */
	/**
	* Organize and classify Items for Character sheets
	* @private
	*/
	_prepareItems(actorData,itemQuerry) {
		// Inventory
		const distribution = [];
		const inventory=[];
		const totals={pp:0,gp:0,ep:0,sp:0,cp:0};
		let totalWeight = 0;
		const distActor = actorData.flags.distActor;
		var distActorLen = 0;

		if (itemQuerry !== true){
			// if no xpAward then add it
			if (actorData.flags.xpAward === undefined){
				var flags = JSON.parse(JSON.stringify(actorData.flags));
				flags.xpAward = 0;
				const actor = game.actors.get(actorData._id);
				actor.update({flags:flags});
			}
		}
		// Iterate through distActor
		if (distActor !== undefined){
			distActorLen = distActor.length;
			for (var a=0; a<distActorLen; a++){
				const actor = game.actors.get(distActor[a].id);
				if (actor.data.flags.incarnateLog === undefined){
					distActor[a].gv = 0;
				}else{
					var gv = 0;
					actor.data.flags.incarnateLog.forEach(log =>{
						gv = Number(gv) + Number(log.gv);
					});
					distActor[a].gv = gv;
				}
				distribution.push({about:distActor[a],items:[]});
				totals.pp+=Number(distActor[a].currency.pp.value);
				totals.gp+=Number(distActor[a].currency.gp.value);
				totals.ep+=Number(distActor[a].currency.ep.value);
				totals.sp+=Number(distActor[a].currency.sp.value);
				totals.cp+=Number(distActor[a].currency.cp.value);
			}
		}
		// Iterate through items, allocating to containers
		for ( let i of actorData.items ) {
			i.img = i.img || DEFAULT_TOKEN;
			 if (i.type==="backpack" || i.type==="consumable" || i.type==="equipment" || i.type==="weapon" || i.type==="tool"){
				i.data.quantity.value = i.data.quantity.value || 1;
				i.data.weight.value = i.data.weight.value || 0;
				i.totalWeight = Math.round(i.data.quantity.value * i.data.weight.value * 10) / 10;
				i.hasCharges = (i.type === "consumable") && i.data.charges.max > 0;
				totalWeight += i.totalWeight;
				if (i.flags.distribution===undefined){
					inventory.push(i);
				}else{
					for (var a=0; a<distActorLen; a++){
						if (i.flags.distribution === distribution[a].about.id){
							distribution[a].items.push(i);
						}
					}
				}
			}
		}

		if (itemQuerry === true){
			return {distribution:distribution,inventory:inventory};
		}else{
			// Assign and return
			actorData.inventory = inventory;
			actorData.distribution = distribution;
			actorData.totals = totals;
		}
	}
	/* -------------------------------------------- */
	/*  Buttons
	 *  ------------------------------------------- */
	_splitCoins(ev){
		const actor = this.object;
		if (actor.data.flags.distActor === undefined){return false};
		var distActor = JSON.parse(JSON.stringify(actor.data.flags.distActor));
		distActor = this._splitCoinsLoop("pp",actor.data.data.currency.pp.value,distActor);
		distActor = this._splitCoinsLoop("gp",actor.data.data.currency.gp.value,distActor);
		distActor = this._splitCoinsLoop("ep",actor.data.data.currency.ep.value,distActor);
		distActor = this._splitCoinsLoop("sp",actor.data.data.currency.sp.value,distActor);
		distActor = this._splitCoinsLoop("cp",actor.data.data.currency.cp.value,distActor);
		var flags = JSON.parse(JSON.stringify(actor.data.flags));
		flags.distActor = distActor;
		actor.update({flags:flags});
		actor.render(false);
	}
	_splitCoinsLoop(type,value,distActors){
		const split = Math.floor(value / distActors.length);
		distActors.forEach(distActor => {
			distActor.currency[type].value = split;
		});
		return distActors;
	}
	_distribute(ev){
		var startingData = this._prepareItems(this.object.data,true);
		const distSheet = this.object.data;
		const xpAward = Math.floor(distSheet.flags.xpAward / startingData.distribution.length);
		startingData.distribution.forEach(distActor => {
			const actorThis = game.actors.get(distActor.about.id);
			if (actorThis !== undefined){
				if (actorThis.data.type === "character"){
					const pp = Number(distActor.about.currency.pp.value);
					const gp = Number(distActor.about.currency.gp.value);
					const ep = Number(distActor.about.currency.ep.value);
					const sp = Number(distActor.about.currency.sp.value);
					const cp = Number(distActor.about.currency.cp.value);
					var totalValue = pp*10 + gp + ep/2 + sp/10 + cp/100;
					var items = JSON.parse(JSON.stringify(actorThis.data.items));
					var itemID = 1;
					var newItems = [];
					items.forEach(item => {
						if (item.id > itemID){
							itemID=item.id;
						}
					});
					distActor.items.forEach(item =>{
						itemID++;
						totalValue+=Incarnate5eConversions.incarnatePriceConvert(item.data.price.value);
						newItems.push({
							id:item.id,
							sourceId:item.flags.originId,
							name:item.name,
							value:item.data.price.value
						});
						item.id=itemID;
						items.push(item);
					});
					var actorThisData = JSON.parse(JSON.stringify(actorThis.data.data));
					actorThisData.details.xp.value += xpAward;
					actorThisData.currency.pp.value += pp;
					actorThisData.currency.gp.value += gp;
					actorThisData.currency.ep.value += ep;
					actorThisData.currency.sp.value += sp;
					actorThisData.currency.cp.value += cp;
					var flags = JSON.parse(JSON.stringify(actorThis.data.flags));
					if (flags.incarnateLog === undefined){
						flags.incarnateLog=[];
					}
					flags.incarnateLog.push({
						distName:distSheet.name,
						gv:totalValue,
						date:Date.now(),
						incarnateDate:IncarnateCalendar.incarnateDate(),
						gmId:game.user.data._id,
						gmName:game.user.data.name,
						newItems:newItems,
						xp:xpAward,
						notes:""
					});
					console.log(items,actorThisData,flags);
					actorThis.update({flags:flags,data:actorThisData,items:items})
					.then(actorThis.render(false));
				}
			}
		});
	}
	/* --------------------------------------------
	 * Defeated Drop
	 * -------------------------------------------- */
	_defeatedDrop(event){
		const distSheet = this.object;
		const preData = event.dataTransfer.getData("text/plain");
		if(preData.match(/^{\"type\":\"Actor\",\"id\":\"[0-9a-zA-Z]{16}\"}$/)!==null){
			console.log("Defeated Actor Found: ",preData);
			const data = JSON.parse(preData);
			const actor = game.actors.get(data.id);
			const changes = this._defeatedDropDataPull(actor);
			var items = Array.from(distSheet.items);
			var itemId = 1;
			items.forEach(item =>{
				if (item.id>itemId){
					itemId = item.id;
				}
			});
			changes.items.forEach(item =>{
				itemId++;
				item.id = itemId;
				items.push(item);
			});
			var currency = JSON.parse(JSON.stringify(distSheet.data.data.currency));
			currency.pp.value = Number(currency.pp.value) + Number(changes.currency.pp);
			currency.gp.value = Number(currency.gp.value) + Number(changes.currency.gp);
			currency.ep.value = Number(currency.ep.value) + Number(changes.currency.ep);
			currency.sp.value = Number(currency.sp.value) + Number(changes.currency.sp);
			currency.cp.value = Number(currency.cp.value) + Number(changes.currency.cp);
			var flags = JSON.parse(JSON.stringify(distSheet.data.flags));
			flags.xpAward = Number(flags.xpAward) + Number(changes.xp);
			distSheet.update({items:items,flags:flags,data:{currency:currency}})
			distSheet.render(false);
		}
		return false;
	}
	_defeatedDropDataPull(actor){
		var newItems = Array.from(actor.items);
		newItems = newItems.filter(item => item.type==="backpack" || item.type==="consumable" || item.type==="equipment" || item.type==="weapon" || item.type==="tool");
		const currency = {
			pp:actor.data.data.currency.pp.value,
			gp:actor.data.data.currency.gp.value,
			ep:actor.data.data.currency.ep.value,
			sp:actor.data.data.currency.sp.value,
			cp:actor.data.data.currency.cp.value
		}
		var xp;
		if (actor.data.type==="character"){
			xp = 0;
		}else{
			xp = actor.data.data.details.xp.value;
		}
		return {items:newItems,currency:currency,xp:xp};
	}
	/* -------------------------------------------
	 * Delete Distribution Actor
	 * ------------------------------------------- */

	_deleteDistActor(event){
		const distSheet = this.object;
		var deleteId = event.srcElement.parentElement.parentElement.parentElement.getAttribute("data-id");
		if (deleteId === null){
			deleteId = event.srcElement.parentElement.parentElement.parentElement.parentElement.getAttribute("data-id");
		}
		if (deleteId === null){
			console.warn("deleteId not found",event.srcElement.parentElement.parentElement.parentElement);
			return false;
		}
		const items = Array.from(distSheet.data.items);
		const flags = JSON.parse(JSON.stringify(distSheet.data.flags));
		console.log("distSheet",distSheet,"deleteId",deleteId,"items",items,"flags",flags);
		flags.distActor = flags.distActor.filter(distActor => distActor.id!==deleteId);
		const itemLen = items.length;
		for (var a=0; a<itemLen; a++){
			if (items[a].flags.distribution === deleteId){
				items[a].flags.distribution = undefined;
			}
		}
		distSheet.update({items:items,flags:flags});
		distSheet.render(false);
	}

	/* -------------------------------------------- */
	/*  Event Listeners and Handlers
	/* -------------------------------------------- */

	/**
	* Activate event listeners using the prepared sheet HTML
	* @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
	*/
	activateListeners(html) {
		super.activateListeners(html);
		let handler = ev => this._onDragItemStart(ev);
		html.find('.incarnate-items').each((i, li) => {
			li.setAttribute("draggable", true);
			li.addEventListener("dragstart", handler, false);
		});
		html.find('.inventory-header').each((i, li) => {
			li.setAttribute("draggable", false);
		});
		if (!game.user.isGM){
			this.form.ondragover = ev => this._onDragOver(ev);
			this.form.ondrop = ev => this._onDropPlayer(ev);
		}else{
			let handlerSplitCoins = ev => this._splitCoins(ev);
			let handlerDistribute = ev => this._distribute(ev);
			let handlerDeleteDistActor = ev => this._deleteDistActor(ev);
			let handlerAddItem = ev => this.addItem(ev);
			html.find(".split-coins").each((i, bt) => {
				bt.addEventListener("click",handlerSplitCoins, false);
			});
			html.find(".distribute").each((i, bt) => {
				bt.addEventListener("click",handlerDistribute, false);
			});
			html.find(".delete-distActor").each((i, bt) => {
				bt.addEventListener("click",handlerDeleteDistActor, false);
			});
			this.form.getElementsByClassName("defeatedNpcs")[0].ondrop = ev =>{
				ev.stopPropagation();
				this._defeatedDrop(ev);
			}
			html.find(".incarnate-create").each((i, bt) => {
				bt.addEventListener("click",handlerAddItem, false);
			});
		}

		// Everything below here is only needed if the sheet is editable
		if (!this.options.editable) return;

	}
	/* -------------------------------------------- */
	static async createLootParcel(ev){
		const app = IncarnateReference.getClosestClass(ev.srcElement,"app");
		const startingXp = Number(app.getElementsByClassName("incarnateBonusXp")[0].value);
		app.remove();
		var lootParcel = await Actor5e.create({name:"Loot Sheet - " + game.user.data.name + " - " + IncarnateCalendar.incarnateDate(), type: "character"}, {"displaySheet": false});
		const combatDetails = IncarnateLootDistributionSheet.getCombatDetails(startingXp);
		lootParcel.update({flags:combatDetails.flags,items:combatDetails.items,data:{currency:combatDetails.currency},permission:{default:2}});
		const postResolve = new Promise (async (resolve,reject)=>{
			await IncarnateReference.incarnateDelay(200);
			if (game.settings.get("incarnateFiveEMod","renderLootParcel")) lootParcel.sheet.render(true);
		});
		postResolve;
	}
	static quickXp (ev){
		const app = IncarnateReference.getClosestClass(ev.srcElement,"app");
		const startingXp = Number(app.getElementsByClassName("incarnateBonusXp")[0].value);
		app.remove();
		const combatDetails = IncarnateLootDistributionSheet.getCombatDetails(startingXp);
		console.log(combatDetails);
		const xp = Math.ceil(combatDetails.flags.xpAward / combatDetails.flags.distActor.length);
		combatDetails.flags.distActor.forEach(distActor =>{
			const actor = game.actors.get(distActor.id);
			if (actor.data.type === "character"){
				const flags = JSON.parse(JSON.stringify(actor.data.flags));
				if (flags.incarnateLog === undefined) flags.incarnateLog = [];
				flags.incarnateLog.push({
					distName:"Quick Xp",
					gv:0,
					date:Date.now(),
					incarnateDate:IncarnateCalendar.incarnateDate(),
					gmId:game.user.data._id,
					gmName:game.user.data.name,
					newItems:[],
					xp:xp,
					notes:""
				});
				actor.update({flags:flags,data:{details:{xp:{value: actor.data.data.details.xp.value + xp}}}});
				actor.render(false);
			}
		});
	}
	static getCombatDetails(startingXp){
		startingXp = startingXp || 0;
		var flags = {core:{sheetClass:"incarnate5eMod.IncarnateLootDistributionSheet"},distActor:[],xpAward : startingXp},
			currency = {
				pp:{type:"Number",label:"Platinum",value:0},
				gp:{type:"Number",label:"Gold",value:0},
				ep:{type:"Number",label:"Electrum",value:0},
				sp:{type:"Number",label:"Silver",value:0},
				cp:{type:"Number",label:"Copper",value:0},
			},
			items = [],
			itemId = 1;
		const combatTracker = game.combats.source.find(source => source.active === true);
		combatTracker.combatants.forEach(combatant =>{
			if (combatant.defeated === true){
				var changes = IncarnateLootDistributionSheet.prototype._defeatedDropDataPull(combatant.actor);
				changes.items.forEach(item =>{
					item = JSON.parse(JSON.stringify(item));
					itemId++;
					item.id = itemId;
					items.push(item);
				});
				flags.xpAward = Number(flags.xpAward) + Number(changes.xp);
				currency.pp.value = Number(currency.pp.value) + Number(changes.currency.pp);
				currency.gp.value = Number(currency.gp.value) + Number(changes.currency.gp);
				currency.ep.value = Number(currency.ep.value) + Number(changes.currency.gp);
				currency.sp.value = Number(currency.sp.value) + Number(changes.currency.sp);
				currency.cp.value = Number(currency.cp.value) + Number(changes.currency.cp);
			}else{
				flags.distActor.push({
					id: combatant.actor.data._id,
					name: combatant.actor.data.name,
					currency: {
						pp:{label:"PP",value:0},
						gp:{label:"GP",value:0},
						ep:{label:"EP",value:0},
						sp:{label:"SP",value:0},
						cp:{label:"CP",value:0}
					}
				});
			}
		});
		game.combat.delete();
		return {flags:flags,currency:currency,items:items};
	}
}
class IncarnateActorSheet extends ActorSheet {
	static get defaultOptions() {
		const options = super.defaultOptions;
		options.width = 710;
		options.classes = ["sheet", "incarnate-pc"];
		options.template = "modules/incarnateFiveEMod/templates/incarnateActorSheet.html";
		return options;
	};

	/* -------------------------------------------- */
	
	/**
	* Get the correct HTML template path to use for rendering this particular sheet
	* @type {String}
	*/

	get template() {
		return "modules/incarnateFiveEMod/templates/incarnateActorSheet.html";
	}

	/* -------------------------------------------- */
	/**
	* Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
	*/
	getData() {
		const sheetData = super.getData();

		// Return data for rendering
		console.log("Sheet Data",sheetData);
		//if (sheetData.actor.flags.inspiration === undefined)sheetData.actor.flags.inspiration = 0;
		if (sheetData.actor.data.details.personality === undefined) sheetData.actor.data.details.personality = {type:"String", label:"Personality", value:""};
		return sheetData;
	}

	/* -------------------------------------------- */
	/**
	* Organize and classify Items for Character sheets
	* @private
	*/
	_prepareItems(actorData) {

		// Inventory
		const inventory = {
			weapon: { label: "Weapons", items: [] },
			equipment: { label: "Equipment", items: [] },
			consumable: { label: "Consumables", items: [] },
			tool: { label: "Tools", items: [] },
			backpack: { label: "Backpack", items: [] },
		};

		// Iterate through items, allocating to containers
		let totalWeight = 0;
		for ( let i of actorData.items ) {
			i.img = i.img || DEFAULT_TOKEN;

			// Inventory
			if ( Object.keys(inventory).includes(i.type) ) {
			i.data.quantity.value = i.data.quantity.value || 1;
			i.data.weight.value = i.data.weight.value || 0;
			i.totalWeight = Math.round(i.data.quantity.value * i.data.weight.value * 10) / 10;
			i.hasCharges = (i.type === "consumable") && i.data.charges.max > 0;
			inventory[i.type].items.push(i);
			totalWeight += i.totalWeight;
			}
		}

		// Assign and return
		actorData.inventory = inventory;
		//Key Statistics
		const keyStatistics = {
			classes: {label:"Class",items:[]},
			backgrounds: {label:"Background",items:[]},
			races: {label:"Races",items:[]}
		};
		const actorItemLen = actorData.items.length;
		for (var a=0; a<actorItemLen; a++){
			if (actorData.items[a].type==="class"){
				if (actorData.items[a].flags.family === "class"){
					keyStatistics.classes.items.push(actorData.items[a]);
				}else if (actorData.items[a].flags.family === "background"){
					keyStatistics.backgrounds.items.push(actorData.items[a]);
				}else if (actorData.items[a].flags.family === "race"){
					keyStatistics.races.items.push(actorData.items[a]);
				}
			}
		}
		actorData.keyStatistics = keyStatistics;
		console.log(actorData.flags.playerName);
		if (actorData.flags.playerName === undefined){
			actorData.flags.playerName = "";
		}
	}

	/* -------------------------------------------- */
	/*  Event Listeners and Handlers
	/* -------------------------------------------- */

	/**
	* Activate event listeners using the prepared sheet HTML
	* @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
	*/
	activateListeners(html) {
		const htmlDom = $(html)[0];
		super.activateListeners(html);

		// Everything below here is only needed if the sheet is editable
		if (!this.options.editable) return;


	}
	/* -------------------------------------------- */
	async _onDrop(event) {
		event.preventDefault();
		// Try to extract the data
		let data;
		const preData = event.dataTransfer.getData("text/plain");
		const preDataCheck = await IncarnateReference.incarnateJSONcheck(preData);
		if (preDataCheck === true){
			data = JSON.parse(preData);
		}else{
			return false;
		}
		if (data.length !== undefined){
			var dataLen = data.length;
			var startingItems = Array.from(this.actor.data.items);
			const startItemLen = startingItems.length;
			var itemId=1;
			var promises=[];
			for (var a=0;a<startItemLen;a++){
				if (startingItems[a].id>itemId){
					itemId=startingItems[a].id;
				}
			}
			for (var a=0;a<dataLen;a++){
				if ( data[a].type !== "Item" ){
				}else{
					if (data[a].actorId != undefined){
						itemId++;
						promises[a]=IncarnateAutoLevel.incarnateFormatItem(data[a].id,null,itemId,null,data[a].actorId)
						.then((result)=>{
							startingItems.push(result);
						});
					}else if ( data[a].pack != undefined ){
						itemId++;
						promises[a]=IncarnateAutoLevel.incarnateFormatItem(data[a].id,data[a].pack,itemId)
						.then((result)=>{
							startingItems.push(result);
						});
					}else {
						itemId++;
						promises[a]=IncarnateAutoLevel.incarnateFormatItem(data[a].id,null,itemId)
						.then((result)=>{
							startingItems.push(result);
						});
					}
				}
			}
			Promise.all(promises).then((result)=>{
				this.actor.update({items: startingItems});
			})
			.then((result)=>{
				this.actor.render(false);
			});
		}else{
			if ( data.type !== "Item" ) return;
			// From Compendium
			if ( data.pack ) {
				this.actor.importItemFromCollection(data.pack, data.id);
			}

			// From Actor
			else if ( data.actorId ) {
				if ( data.actorId === this.actor._id ) return false;
				let actor = game.actors.get(data.actorId),
				item = duplicate(actor.items.find(i => i.id === data.id));
				item.id = null;
				this.actor.createOwnedItem(item, true);
			}

			// From World
			else {
				let item = game.items.get(data.id);
				this.actor.createOwnedItem(item.data, true);
			}
		}
		return false;
	}
}
Actors.registerSheet("incarnate5eMod", IncarnateActorSheet, {
	types: ["character"],
	makeDefault: false
});
Actors.registerSheet("incarnate5eMod", IncarnateItemParcelSheet, {
	types: ["character"],
	makeDefault: false
});
Actors.registerSheet("incarnate5eMod", IncarnateLootDistributionSheet, {
	types: ["character"],
	makeDefault: false
});
class IncarnateCanvas{
  /**
   * Handle dropping of Actor data onto the Scene canvas
   * @private
   * options: {p:[x,y],grid,xEnd,altKey}
   */
	static async _onEncounterDrop(event, data,options){
		var p=[0,0];
		if (options !== undefined && options.p !== undefined){
			p = options.p;
		}else{
			let [x, y] = [event.clientX, event.clientY];
			let t = canvas.tokens.worldTransform;
			var tx = (x - t.tx) / canvas.stage.scale.x,
				ty = (y - t.ty) / canvas.stage.scale.y;
			var p = canvas.grid.getTopLeft(tx, ty);
		}
		var xEnd = 1000000000000;
		if (options !== undefined && options.xEnd !== undefined){
			xEnd = options.xEnd;
		}
		var deltaX=1,deltaY=1;
		const xStart = p[0];
		if (options !== undefined && options.grid !== undefined){
			deltaX = options.grid;
			deltaY = options.grid;
		}else{
			deltaX = canvas.scene.data.grid;
			deltaY = canvas.scene.data.grid;
		}
		var altKey=false;
		if (options !== undefined && options.altKey !== undefined){
			altKey = options.altKey;
		}else{
			altKey = event.altKey;
		}
		data.encounter.forEach(async npc =>{
			const gameActors = game.actors.entities;
			const gameActorLen = gameActors.length;
			for (var a=0; a<gameActorLen; a++){
				if(npc.id ===gameActors[a].data.flags.originId){
					npc={
						type:"Actor",
						id:gameActors[a].data._id,
						quantity:npc.quantity
					}
					break;
				}
			}
			let actor;
			if ( npc.pack ) actor = await game.actors.importFromCollection(npc.pack, npc.id);
			else actor = game.actors.get(npc.id);
			var sizeMod = 1;
			const size = actor.data.data.traits.size.value;
			if (size === "lg") sizeMod = 2;
			else if (size === "huge") sizeMod = 3;
			else if (size === "grg") sizeMod = 4;
			for (var b=0; b<npc.quantity; b++){
				if (p[0] + (deltaX * sizeMod) > xEnd){
					p[0] = xStart;
					p[1]+= deltaY * sizeMod;
				}
				// Prepare Token data specific to this placement
				const tokenData = {
					x: p[0],
					y: p[1],
					hidden: altKey
				};
				p[0]+= deltaX * sizeMod;
				// Call the Actor drop method
				await canvas.tokens.dropActor(actor, tokenData);
			}
		});
	}
	async _onDropActorData(event, data) {
		if (data.pack != undefined){
			const gameActors = game.actors.entities;
			const gameActorLen = gameActors.length;
			for (var a=0; a<gameActorLen; a++){
				if(data.id ===gameActors[a].data.flags.originId){
					const newData={
						type:"Actor",
						id:gameActors[a].data._id
					}
					data = newData;
					break;
				}
			}
		}
		// Acquire Actor entity
		let actor;
		if ( data.pack ) actor = await game.actors.importFromCollection(data.pack, data.id);
		else actor = game.actors.get(data.id);

		// Acquire cursor position transformed to Canvas coordinates
		let [x, y] = [event.clientX, event.clientY];
		let t = this.worldTransform,
		tx = (x - t.tx) / canvas.stage.scale.x,
		ty = (y - t.ty) / canvas.stage.scale.y;
		let p = canvas.grid.getTopLeft(tx, ty);

		// Prepare Token data specific to this placement
		const tokenData = {
			x: p[0],
			y: p[1],
			hidden: event.altKey
		};

		// Call the Actor drop method
		this.dropActor(actor, tokenData);
	}
}
class IncarnateItemSheetChanges{
	_onDragStart(event) {
		const li = this;
		var type,pack,_id;
		if (li.object.data.flags.origin !== undefined){
			type= li.object.data.flags.origin.type;
			pack= li.object.data.flags.origin.pack;
			_id= li.object.data.flags.origin._id;
		}else if(li.object.data._id !== undefined){
			event.dataTransfer.setData("text/plain", JSON.stringify({
				type: "Item",
				id: li.object.data._id
			}));
			return true;
		}else{
			console.log("Error 1994: item reference not found");
			event.preventDefault();
			return false;
		}
		if (type==="backpack" || type==="consumable" || type==="equipment" || type==="weapon" || type==="tool" || type==="feat" || type==="class"){
			type="Item"
		}
		// Set the transfer data
		event.dataTransfer.setData("text/plain", JSON.stringify({
			type: type,
			pack: pack,
			id: _id
		}));
	}
}
class IncarnateFiveEMessages{
	static crossReferenceParseActor(name){
		var actor = game.actors.entities.find(actor => name.includes(actor.data.name));
		if (actor === undefined){
			console.log("Actor: ", name, " not found");
			return false;
		}
		return '<p><strong>Result:</strong> <span class="crossReference" data-fid="' + actor.data._id + '" data-type="Actor">' + actor.data.name + '</span> .</p>';
	}
	static crossReferenceParseItem(name){
		var item = game.items.entities.find(item => name.includes(item.data.name));
		if (item === undefined){
			console.log("Item: ", name, " not found");
			return false;
		}
		return '<p><strong>Result:</strong> <span class="crossReference" data-fid="' + item.data._id + '" data-type="Item">' + item.data.name + '</span> .</p>';
	}
	static crossReferenceParseJournal(name){
		var journal = game.journal.entities.find(journal => name.includes(journal.data.name));
		if (journal === undefined){
			console.log("Journal: ", name, " not found");
			return false;
		}
		return '<p><strong>Result:</strong> <span class="crossReference" data-fid="' + journal.data._id + '" data-type="JournalEntry">' + journal.data.name + '</span> .</p>';
	}
}
function incarnatePlayerQuickSheet(){
	IncarnateReference.crossReference("HlyV9728fyQUUdDx","JournalEntry","incarnateRules");
}
class IncarnateRandomEncounter{
	static async incarnateSetupDefaults(){
		game.settings.register("incarnateFiveEMod","randomEncBeasts", {
			name: "Random Encounters Beasts",
			hint: "Holds a list of monsters that can be used for random encounters.",
			default: {},
			type: Object,
			scope: 'world',
			onChange: settings => {
				console.log(settings);
			}
		});
		game.settings.register("incarnateFiveEMod","randomEncounters", {
			name: "Random Encounters Possibilities",
			hint: "Holds a list of possibilities for a dungeon encounter.",
			default: [],
			type: Object,
			scope: 'world',
			onChange: settings => {
				console.log(settings);
			}
		});
		if( game.settings.get("incarnateFiveEMod","randomEncBeasts") =={}){
			console.log("Creating Random Encounter Beast Settings");
			var tempBeasts = await IncarnateRandomEncounter.defaultArray();
			game.settings.set("incarnateFiveEMod","randomEncBeasts",tempBeasts);
		}
		if (game.settings.get("incarnateFiveEMod","randomEncounters") ==""){
			console.log("Creating Random Encounters array");
			game.settings.set("incarnateFiveEMod","randomEncounters",[]);
		}
	}
	static async defaultArray(){
		const beasts = [];
		const incarnateBeasts = await game.packs.find(p => p.collection === "incarnateFiveECompendia.incarnateBestiary").getContent();
		incarnateBeasts.forEach(beast => {
			beasts.push({
				name:beast.data.name,
				pack:"incarnateFiveECompendia.incarnateBestiary",
				_id:beast.data._id,
				data:beast.data.data,
				flags:beast.data.flags
			});
		});
		return beasts;
	}
	static async resetDefaultBeasts(){
		console.log("Creating Random Encounter Beast List");
		var tempBeasts = await IncarnateRandomEncounter.defaultArray();
		game.settings.set("incarnateFiveEMod","randomEncBeasts",tempBeasts);
	}
	static resetDefaultEncounters(){
		console.log("Creating Random Encounters array");
		game.settings.set("incarnateFiveEMod","randomEncounters",[]);
		IncarnateReference.incarnateDelay(300).then(result =>{
			if (ui._gmblind !== undefined){
				ui._gmblind.render(false);
			}
		});
	}
/*GM Screen Modifications*/
	static primeDefaultEncounters(ev){
		new Dialog({
			title:"Confirm Delete All Random Encounters",
			content: `<p>Are you sure you want to delete all random encounters</p>`,
			buttons:{
				yes:{
					icon: '<i class="fas fa-atom"></i>',
					label:"Yes",
					callback: () => IncarnateRandomEncounter.resetDefaultEncounters()
				},
				cancel:{
					icon: '<i class="fas fa-times"></i>',
					label: "Cancel"
				}
			},
			default:"cancel"
		}).render(true);
	}
	static randomENavButton(app){
		var navA = document.createElement("a");
		navA.setAttribute("class","item");
		navA.setAttribute("data-tab","randomEncounters");
		navA.setAttribute("title","Random Encounters");
		navA.innerHTML='<i class="fas fa-fist-raised"></i>';
		app.getElementsByTagName("nav")[0].append(navA);
	}
	static randomEDiv(app){
		const form = app.getElementsByTagName("form")[0];
		const encounterDiv = document.createElement("div");
		encounterDiv.setAttribute("class","encounterDiv flex");
		const encounters = game.settings.get("incarnateFiveEMod","randomEncounters");
		encounters.forEach(encounter =>{
			var beastLog = document.createElement("div");
			encounter.beasts.forEach(beast =>{
				beastLog.innerHTML += IncarnateRandomEncounter.randomEBeastFormat(beast);
			});
			beastLog.setAttribute("class","beastLog");
			encounterDiv.innerHTML += IncarnateRandomEncounter.randomEEncounter(encounter,beastLog);
		});
		var randomTab = IncarnateRandomEncounter.randomETab(encounterDiv);
		const settingsToggles = randomTab.getElementsByClassName("settingsToggle");
		[].forEach.call(settingsToggles, settingToggle=>{
			settingToggle.addEventListener("click",IncarnateRandomEncounter.encounterSettingsDisplay);
		});
		const settingsTrash = randomTab.getElementsByClassName("settingsTrash");
		[].forEach.call(settingsTrash, settingTrash=>{
			settingTrash.addEventListener("click",IncarnateRandomEncounter.encounterSettingTrash);
		});
		form.append(randomTab);
		form.getElementsByClassName("rollEncounters")[0].addEventListener("click",IncarnateRandomEncounter.rollEncounters);
		form.getElementsByClassName("clearEncounters")[0].addEventListener("click",IncarnateRandomEncounter.clearEncounters);
		form.getElementsByClassName("resetBeasts")[0].addEventListener("click",IncarnateRandomEncounter.resetDefaultBeasts);
		form.getElementsByClassName("resetEncounters")[0].addEventListener("click",IncarnateRandomEncounter.primeDefaultEncounters);
		form.getElementsByClassName("newEncounterType")[0].addEventListener("click",IncarnateRandomEncounterConfig.createEncounterConfig);
		const encounterTabInputs = app.getElementsByClassName("incRandomEncounterSetting");
		[].forEach.call(encounterTabInputs,input=>{
			input.addEventListener("change",IncarnateRandomEncounter.encounterSettingUpdate);
		});
	}
	static randomEBeastFormat(beast){
		var value =`<div class="beast row">
			<p class="beastName flex-static">${beast.name}</p>
			<p class="beastXP flex">${beast.xp}</p>
		</div>`;
		return value;
	}
	static randomEEncounter(encounter,beastLog){
		const value = `<div class="encounter" data-status="heading" data-id="${encounter.id}">
			<!--heading|settings|log-->
			<div class="encounterHeading row">
				<input type="number" class="weight incRandomEncounterSetting flex" name="weight" value="${encounter.weight}"/>
				<input type="text" class="name incRandomEncounterSetting flex" name="name" value="${encounter.name}"/>
				<a class="flex-auto fas fa-cogs settingsToggle"></a>
				<a class="flex-auto fas fa-trash settingsTrash"></a>
			</div>
			<div class="encounterSettings">
				<div class="group-setting row">
					<span class="label flex-static">Min XP</span>
					<input type="number" class="minXP incRandomEncounterSetting" name="minXP" value="${encounter.minXP}"/>
				</div>
				<div class="group-setting row">
					<span class="label flex-static">Max XP</span>
					<input type="number" class="maxXP incRandomEncounterSetting" name="maxXP" value="${encounter.maxXP}"/>
				</div>
				<div class="group-setting row">
					<span class="label flex-static">Minimum # NPCs</span>
					<input type="number" class="minNpc incRandomEncounterSetting" name="minNpc" value="${encounter.minNpc}"/>
				</div>
				<div class="group-setting row">
					<span class="label flex-static">Maximum # NPCs</span>
					<input type="number" class="maxNpc incRandomEncounterSetting" name="maxNpc" value="${encounter.maxNpc}"/>
				</div>
			</div>
			${beastLog.outerHTML}
		</div>`
		return value;
	}
	static randomETab(encounterDiv){
		var randomTab = document.createElement("div");
		randomTab.setAttribute("class","tab incarnateRandomEncounters flex");
		randomTab.setAttribute("data-tab","randomEncounters");
		randomTab.setAttribute("data-group","incarnateGMblindGroup");
		randomTab.innerHTML =
		`<div class="flex-auto row">
			<input type="number" class="flex rollCount" value="5"/>
			<button class="flex rollEncounters" type="Button">Roll</button>
			<button class="flex clearEncounters" type="Button">Clear</button>
		</div>
		<div class="rolledEncounterHeadings">
			<span class="name">Name</span>
			<span class="quantity">Quantity</span>
			<span class="xp">XP</span>
		</div>
		<div class="rolledEncounters"></div>
		<button class="flex-auto newEncounterType" type="button">New Encounter Type</button>
		<div class="flex-auto row">
			<button class="flex resetBeasts" type="button">Reset Beasts</button>
			<button class="flex resetEncounters" type="button">Reset Encounters</button>
		</div>`;
		randomTab.append(encounterDiv);
		return randomTab;
	}
	static encounterSettingsDisplay(ev){
		const encDiv = IncarnateReference.getClosestClass(ev.srcElement,"encounter");
		var stat = encDiv.getAttribute("data-status");
		if (stat === "heading"){
			encDiv.setAttribute("data-status","settings");
		}else if (stat === "settings"){
			encDiv.setAttribute("data-status","log");
		}else{
			encDiv.setAttribute("data-status","heading");
		}
	}
	static encounterSettingTrash(ev){
		const encounter = IncarnateReference.getClosestClass(ev.srcElement,"encounter");
		if (encounter.getAttribute("trashprimed") === null){
			encounter.setAttribute("trashprimed","true");
		}else{
			const id = Number(encounter.getAttribute("data-id"));
			const settings = game.settings.get("incarnateFiveEMod","randomEncounters");
			const index = settings.findIndex(setting => setting.id === id);
			settings.splice(index,1);
			game.settings.set("incarnateFiveEMod","randomEncounters",settings);
			encounter.remove();
		}
	}
	static encounterSettingUpdate(ev){
		const element = ev.srcElement;
		const settings = game.settings.get("incarnateFiveEMod","randomEncounters");
		const encounterNode = IncarnateReference.getClosestClass(element,"encounter");
		const id = Number(encounterNode.getAttribute("data-id"));
		const name = element.getAttribute("name");
		const value = IncarnateReference.getInputValue(element);
		const setting = settings.findIndex(setting => setting.id === id);
		setProperty(settings[setting],name,value);
		game.settings.set("incarnateFiveEMod","randomEncounters",settings);
		return settings;
	}
	static rollEncounters(ev){
		const app = IncarnateReference.getClosestClass(ev.srcElement,"app");
		const settings = game.settings.get("incarnateFiveEMod","randomEncounters");
		const result = IncarnateRandomEncounterRoll.roll(settings,Number(app.getElementsByClassName("rollCount")[0].value));
		console.log(result);
		const rolledEncounters = app.getElementsByClassName("rolledEncounters")[0];
		rolledEncounters.style.flex = 1;
		result.encounters.forEach(encounter =>{
			const holderDiv = document.createElement("div");
			var totalXP = 0;
			encounter.encounter.forEach(beast =>{
				totalXP += (beast.quantity * beast.xp);
			});
			encounter.encounter.forEach(beast =>{
				holderDiv.innerHTML +=`<p class="beast">
					<span class="name">${beast.name}</span>
					<span class="quantity">${beast.quantity}</span>
				</p>`;
			});
			holderDiv.setAttribute("class","generatedBeasts");
			const encounterDiv = document.createElement("div");
			encounterDiv.setAttribute("class","generatedEncounter");
			encounterDiv.setAttribute("data-encounter",JSON.stringify(encounter));
			encounterDiv.setAttribute("draggable","true");
			encounterDiv.addEventListener("dragstart",IncarnateRandomEncounter.encounterDragStart);
			encounterDiv.append(holderDiv);
			encounterDiv.innerHTML+=`<p class="totalXP">${totalXP}</p>`;
			rolledEncounters.append(encounterDiv);
		});
	}
	static clearEncounters(ev){
		const app = IncarnateReference.getClosestClass(ev.srcElement,"app");
		const rolledEncounters = app.getElementsByClassName("rolledEncounters")[0];
		rolledEncounters.innerHTML="";
	}
	static encounterDragStart(ev){
		const encounter = IncarnateReference.getClosestClass(ev.srcElement,"generatedEncounter");
		ev.dataTransfer.setData("text/plain",encounter.getAttribute("data-encounter"));
	}
}
class IncarnateRandomEncounterRoll{
	//maxSize is an integer. 1=medium 2=large 3=huge 4=gargantuan
	static roll(array,rolls,maxSize){
		array = array || game.settings.get("incarnateFiveEMod","randomEncounters");
		if (array.length === 0) {
			alert('No random encounter types provided, please "New Encounter Type" first.');
			return false;
		}
		rolls = rolls || 1;
		maxSize = maxSize || 4;
		const totalWeight = this.getTotalWeight(array);
		const result = {type:"encounters",encounters:[]};
		for (var a=0; a<rolls; a++){
			const encounter = this.getRandomEncounter(array,totalWeight);
			const smallestXP = this.getSmallestXp(encounter.beasts);
			const maxXP = this.getMaxXP(encounter,smallestXP);
			result.encounters.push(this.generateEncounter(encounter,maxXP,smallestXP,maxSize));
		}
		return result;
	}
	static getTotalWeight(array){
		var weight = 0;
		array.forEach(encounter =>{
			weight += Number(encounter.weight);
		});
		return weight;
	}
	static getRandomEncounter(array,weight){
		const randomNumber = weight * Math.random();
		rollCount++;
		var currentWeight = 0;
		const arrayLen = array.length;
		for (var a=0; a<arrayLen; a++){
			currentWeight += Number(array[a].weight);
			if (currentWeight >= randomNumber){
				return array[a];
			}
		}
		console.warn("Get Random Encounter failed, returning first encounter");
		return array[0];
	}
	static getSmallestXp(beasts){
		var xp = 100000000;
		beasts.forEach(beast =>{
			xp = beast.xp < xp ? beast.xp : xp;
		});
		return xp;
	}
	static getMaxXP(encounter,smallestXP){
		const startMax = Number(encounter.maxXP);
		const startMin = Number(encounter.minXP);
		const randomizedSec = (startMax - startMin - smallestXP);
		if (randomizedSec <= 0) return startMax;
		rollCount+= 2;
		return randomizedSec * ((Math.random()+Math.random())/2) + startMin + smallestXP;
	}
	static generateEncounter(encounter,maxXP,smallestXP,maxSize){
		maxSize = maxSize || 4;
		const randomEncounter = [];
		const minXP = Number(encounter.minXP);
		var beasts = encounter.beasts.filter(beast => this.getSize(beast.size) <= maxSize);
		var remainingXP = maxXP;
		var currentXP = 0;
		var npcCount = 0;
		do{
			beasts = beasts.filter(beast => beast.xp <= remainingXP);
			if (beasts.length > 0){
				const randomBeastSelect = Math.floor(beasts.length * Math.random());
				rollCount++;
				const randomBeast = beasts[randomBeastSelect];
				var numberOfBeasts = Math.floor(remainingXP/randomBeast.xp);
				numberOfBeasts = (npcCount + numberOfBeasts) <= encounter.maxNpc ? numberOfBeasts : encounter.maxNpc - npcCount;
				npcCount += numberOfBeasts;
				remainingXP -= (randomBeast.xp * numberOfBeasts);
				currentXP += (randomBeast.xp * numberOfBeasts);
				randomEncounter.push({
					id:randomBeast._id,
					name:randomBeast.name,
					pack:randomBeast.pack,
					quantity:numberOfBeasts,
					size: this.getSize(randomBeast.size),
					xp:randomBeast.xp
				});
			}
		}while(beasts.length > 0 && currentXP < minXP && remainingXP > smallestXP && npcCount < encounter.maxNpc)
		return ({type:"Encounter",encounter:randomEncounter});
	}
	static getSize(size){
		if (size === "tiny") return 0.25;
		else if (size === "sm") return 0.5;
		else if (size === "med") return 1;
		else if (size === "lg") return 2;
		else if (size === "huge") return 3;
		else if (size === "grg") return 4;
		else return 0;
	}
}
class IncarnateRandomEncounterConfig extends Application{
	static createEncounterConfig(){
		const newEncounter = new IncarnateRandomEncounterConfig;
		newEncounter.render(true);
	}
	constructor(_id, options) {
		super(options);
		this._id = _id;
	}
	static get defaultOptions() {
		const options = super.defaultOptions;
		options.classes = ["dnd5e", "incarnate-randomEncounter-settings", "sheet"];
		options.width = 510;
		options.height = window.innerHeight - 100;
		options.top = 70;
		options.left = 120;
		options.resizable = true;
		options.submitOnUnfocus = true;
		options.template = "modules/incarnateFiveEMod/templates/incarnateRandomEncounterConfig.html";
		return options;
	}
	getData(){
		this.options.title = "New Random Encounter Config";
		var data = {};
		data.incRegions = game.settings.get("incarnate","incRegions");
		return data;
	}
	get id(){
		return "randomEncounterConfig-" + this._id;
	}
	activateListeners(html){
		super.activateListeners(html);
		const htmlDom = $(html)[0];
		htmlDom.getElementsByClassName("createEncounterType")[0].addEventListener("click",IncarnateRandomEncounterConfig.addEncounter);
		//listener to make tabs work
		let nav = $('.tabs[data-group="randomEncounterConfig"]');
		new Tabs(nav, {
			initial: "terrain",
			callback: t => console.log("Tab ${t} was clicked")
		});
		//listener to actively update the beast log
		let inputs = htmlDom.getElementsByTagName("input");
		[].forEach.call(inputs, input=>{
			if (input.type === "checkbox"){
				input.addEventListener("click",IncarnateRandomEncounterConfig.matchCheck);
			}
		});
		let selects = htmlDom.getElementsByTagName("select");
		[].forEach.call(selects, select=>{
			select.addEventListener("click",IncarnateRandomEncounterConfig.matchCheck);
		});
		const postRender = new Promise(async(resolve,reject)=>{
			await IncarnateReference.incarnateDelay(200);
			IncarnateRandomEncounterConfig.matchCheck({srcElement:htmlDom});
		});
		postRender;
	}
	static createEncounterName(app){
		const inputs = app.getElementsByTagName("input");
		var newName = "";
		[].forEach.call(inputs, input =>{
			if (input.type === "checkbox" && input.checked){
				newName += " " + input.nextElementSibling.textContent;
			}
		});
		return newName;
	}
	static addEncounter(ev){
		var id = 0;
		var settings = game.settings.get("incarnateFiveEMod","randomEncounters");
		settings.forEach(encounter =>{
			id = encounter.id > id ? encounter.id : id;
		});
		id++;
		const app = IncarnateReference.getClosestClass(ev.srcElement,"app");
		const newBeasts = IncarnateRandomEncounterConfig.getNewBeasts(app);
		var encounterName = app.getElementsByClassName("encounterName")[0].value;
		if (encounterName === ""){
			encounterName = IncarnateRandomEncounterConfig.createEncounterName(app);
		}
		const minXP = Number(app.getElementsByClassName("minXP")[0].value),
			maxXP = Number(app.getElementsByClassName("maxXP")[0].value),
			minNpc = Number(app.getElementsByClassName("minNpc")[0].value),
			maxNpc = Number(app.getElementsByClassName("maxNpc")[0].value),
			weight = Number(app.getElementsByClassName("encounterWeight")[0].value);
		settings.push({id:id,name:encounterName,minXP:minXP,maxXP:maxXP,minNpc:minNpc,maxNpc:maxNpc,weight:weight,beasts:newBeasts});
		game.settings.set("incarnateFiveEMod","randomEncounters",settings);
		IncarnateReference.incarnateDelay(300).then(result =>{
			if (ui._gmblind !== undefined){
				ui._gmblind.render(false);
			}
		});
	}
	static matchCheck(ev){
		const app = IncarnateReference.getClosestClass(ev.srcElement,"app");
		const newBeasts = IncarnateRandomEncounterConfig.getNewBeasts(app);
		IncarnateRandomEncounterConfig.addBeastLog(app,newBeasts);
	}
	static getNewBeasts(app){
		const filters = IncarnateRandomEncounterConfig.buildFilters(app);
		var beasts = game.settings.get("incarnateFiveEMod","randomEncBeasts");
		var newBeasts = IncarnateRandomEncounterConfig.filterBeasts(filters,beasts);
		return newBeasts;
	}
	static addBeastLog(app,newBeasts){
		const beastLog = app.getElementsByClassName("matchCheckResults")[0];
		beastLog.innerHTML = "";
		newBeasts.forEach(beast =>{
			beastLog.innerHTML += 
			`<div class="beast row">
				<label class="beastName flex-static-big">${beast.name}</label>
				<label class="beastXp flex-static">${beast.xp}</label>
				<label class="beastSize flex-static">${beast.size === "tiny" ? "Tiny" : beast.size === "sm" ? "Small" : beast.size === "med" ? "Medium" : beast.size === "lg" ? "Large" : beast.size === "huge" ? "Huge" : beast.size === "grg" ? "Gargantuan" : ""}</label>
			</div>`
		});
	}
	static filterBeasts(filters,beasts){
		var newBeasts = [];
		beasts.forEach(beast =>{
			var accept = true;
			filters.forEach(filter => {
				if (filter.options.length > 0){
					if (filter.stict === true){
						var value = getProperty(beast,filter.type);
					}else{
						var value = JSON.stringify(getProperty(beast,filter.type));
						value = value === undefined ? "" : value;
					}
					var match = 0;
					filter.options.forEach(option =>{
						if (filter.strict === true){
							if (value === option) match++;
						}else{
							if (value.match(option)!== null) match++;
						}
					});
					if (filter.compileType === "and"){
						if (match !== filter.options.length){
							accept = false
						}
					}else if (filter.compileType === "or"){
						if (match <= 0){
							accept = false
						}
					}else if (filter.compileType === "xor"){
						if (match !== 1){
							accept = false
						}
					}else if (filter.compileType === "not"){
						if (match !== 0){
							accept = false
						}
					}
				}
			});
			if (accept === true){
				newBeasts.push(IncarnateRandomEncounterConfig.beastFormat(beast));
			}
		});
		return newBeasts;
	}
	static buildFilters(app){
		const sections = app.getElementsByClassName("section");
		const filters =[];
		[].forEach.call(sections, section => {
			var options = [];
			var inputs = section.getElementsByTagName("input");
			[].forEach.call(inputs, input =>{
				if (input.checked) options.push(input.value);
			});
			var type = section.getAttribute("data-type");
			var compileType = section.getElementsByClassName("andOr")[0].value;
			var strict = Boolean(section.getElementsByClassName("andOr")[0].getAttribute("data-strict")) ? true : false;
			filters.push({type:type,options:options,compileType:compileType,strict:strict});
		});
		return filters;
	}
	static beastFormat(beast){
		return{
			name:beast.name,
			xp:beast.data.details.xp.value,
			size:beast.data.traits.size.value,
			_id:beast._id,
			pack:beast.pack
		}
	}
}
class IncarnateItemClass{
	static newNav(){
		const newNav = document.createElement("a");
		newNav.setAttribute("class","item");
		newNav.setAttribute("data-tab","incFlags");
		newNav.innerHTML="Flags";
		return newNav;
	}
	static newTab(itemSheet,id){
		const newTab = document.createElement("div");
		newTab.setAttribute("class","tab item-details item-incarnate-flags");
		newTab.setAttribute("data-tab","incFlags");
		newTab.setAttribute("data-id",id);
		if (itemSheet.object.actor !== undefined){
			newTab.setAttribute("data-actor",itemSheet.object.actor.data._id);
		}
		return newTab;
	}
	static allTypes(data,id){
		const family = data.flags === undefined ? "" :
			data.flags.family === undefined ? "" :
			data.flags.family;
		const official = data.flags === undefined ? "":
			data.flags.official === undefined ? "" :
			data.flags.official;
		const originId = data.flags === undefined ? "" :
			data.flags.originId === undefined ? "" :
			data.flags.originId;
		const originLevel = data.flags === undefined ? "" :
			data.flags.origin === undefined ? "" :
			data.flags.origin.level === undefined ? "" :
			data.flags.origin.level;
		const originName = data.flags === undefined ? "" :
			data.flags.origin === undefined ? "" :
			data.flags.origin.name === undefined ? "" :
			data.flags.origin.name;
		const originPack = data.flags === undefined ? "" :
			data.flags.origin === undefined ? "" :
			data.flags.origin.pack === undefined ? "" :
			data.flags.origin.pack;
		const originType = data.flags === undefined ? "" :
			data.flags.origin === undefined ? "" :
			data.flags.origin.type === undefined ? "" :
			data.flags.origin.type;
		const x = 
			`
			<div class="form-group">
				<label>Family</label>
				<select name="flags.family" data-dtype="String">
					<option value${family ==="" ? " selected" : ""}></option>
					<option value="background"${family ==="background" ? " selected" : ""}>background</option>
					<option value="class"${family ==="class" ? " selected" : ""}>class</option>
					<option value="equipment"${family ==="equipment" ? " selected" : ""}>equipment</option>
					<option value="feat"${family ==="feat" ? " selected" : ""}>feat</option>
					<option value="lore"${family ==="lore" ? " selected" : ""}>lore</option>
					<option value="npc"${family ==="npc" ? " selected" : ""}>npc</option>
					<option value="race"${family ==="race" ? " selected" : ""}>race</option>
					<option value="spell"${family ==="spell" ? " selected" : ""}>spell</option>
				</select>
			</div>
			<div class="form-group">
				<label>Officialness</label>
				<select name="flags.official" data-dtype="String">
					<option value${official === "" ? " selected" : ""}></option>
					<option value="true"${official === "true" ? "selected" : ""}>True</option>
					<option value="false"${official === "false" ? "selected" : ""}>False</option>
					<option value="price modified"${official === "price modified" ? "selected" : ""}>Price Modified</option>
					<option value="mechanically modified"${official === "mechanically modified" ? "selected" : ""}>Mechanically Modified</option>
					<option value="description added"${official === "description added" ? "selected" : ""}>Description Added</option>
					<option value="heavily edited"${official === "heavily edited" ? "selected" : ""}>Heavily Edited</option>
				</select>
			</div>
			<div class="flex column originData section">
				<label class="flex">Origin</label>
				<div class="form-group">
					<label title="The id of the item this came from.">Origin Id</label>
					<input type="text" name="flags.originId" data-dtype="String" value="${originId}"/>
				</div>
				<div class="form-group">
					<label title="The level this item was earned.">Origin Level</label>
					<input type="number" name="flags.origin.level" data-dtype="Number" value="${originLevel}"/>
				</div>
				<div class="form-group">
					<label title="The name of the item this came from.">Origin Name</label>
					<input type="text" name="flags.origin.name" data-dtype="String" value="${originName}"/>
				</div>
				<div class="form-group">
					<label title="The pack this item came from.">Origin Pack</label>
					<input type="text" name="flags.origin.pack" data-dtype="String" value="${originPack}"/>
				</div>
				<div class="form-group">
					<label title="The type of the item this came from.">Origin Type</label>
					<select name="flags.origin.type" data-dtype="String">
						<option value=""${originType === "" ? "selected" : ""}></option>
						<option value="class"${originType === "class" ? "selected" : ""}>Class</option>
						<option value="feat"${originType === "feat" ? "selected" : ""}>Feat</option>
						<option value="journalEntry"${originType === "journalEntry" ? "selected" : ""}>Journal Entry</option>
						<option value="actor"${originType === "actor" ? "selected" : ""}>Actor</option>
					</select>
				</div>
			</div>
			<div class="form-group">
				<label>Id</label>
				<span>${id}</span>
			</div>
			`;
		//To Do add Parents
		//To Do add Children
		return x;
	}
	static featType(data){
		//To Do add resources (expenditures)
		var x = `
		<div class="form-group">
			<label>Skills</label>
			<i class="incTraitSelector fas fa-edit" name="flags.traits.incarnateSkillList" data-title="Skills" data-options="incarnateSkillList"></i>
		</div>
		${IncarnateItemClass.onTraitSelectorRender(data.flags.traits.incarnateSkillList,CONFIG.INCARNATE.SkillList)}
		<div class="form-group">
			<label>Languages</label>
			<i class="incTraitSelector fas fa-edit" name="flags.traits.languages" data-title="Languages" data-options="languages"></i>
		</div>
		${IncarnateItemClass.onTraitSelectorRender(data.flags.traits.languages,CONFIG.DND5E.languages)}
		`;
		const family = data.flags === undefined ? "" :
			data.flags.family === undefined ? "" :
			data.flags.family;
		const cLass = data.flags === undefined ? "" :
			data.flags.class === undefined ? "" :
			data.flags.class;
		if (family === "class"){
			x +=
				`<div class="form-group">
					<label>Class</label>
					${IncarnateItemClass.classSelect(cLass,"flags.class")}
				</div>
				`;
		}
		x += IncarnateItemClass.armorClass(data);
		const raceBoosts = [];
		return x;
	}
	static classType(data){
		//To Do add Choice
		x=`
		`;
		return x;
	}
	static backgroundFamily(data){
		//To Do add starting GP
		//To Do add skills
		x=`
		<div class="form-group">
			<label>Skills</label>
			<i class="incTraitSelector fas fa-edit" name="flags.traits.incarnateSkillList" data-title="Skills" data-options="incarnateSkillList"></i>
		</div>
		${IncarnateItemClass.onTraitSelectorRender(data.flags.traits.incarnateSkillList,CONFIG.INCARNATE.SkillList)}
		`;
		return x;
	}
	static classFamily(data){
		//To Do add skills
		//To Do add primary && secondary stat
		//To Do add class Type (class, archetype, class feature, archetype feature)
		//To Do add casting
		//To Do add die size
		x=`
		`;
		return x;
	}
	static raceFamily(data){
		//To Do add race boosts
		//To Do add darkvision
		//To Do add race Type (race, subrace, race feature, subrace feature)
		//To Do add innate spellcasting
		x=`
		`;
		return x;
	}
	static spellType(data){
		x=`
		`;
		return x;
	}
	static itemType(data){
		const itemType = data.flags === undefined ? "":
			data.flags.itemType === undefined ? "":
			data.flags.itemType;
		const itemSubtype = data.flags === undefined ? "" :
			data.flags.itemSubtype === undefined ? "" :
			data.flags.itemSubtype;
		const consumable = data.flags === undefined ? "" :
			data.flags.consumable === undefined ? "" :
			data.flags.consumable;
		const magical = data.flags === undefined ? "" :
			data.flags.magical === undefined ? "" :
			data.flags.magical;
		const mundane = data.flags === undefined ? "" :
			data.flags.mundane === undefined ? "" :
			data.flags.mundane;
		const rarity = data.flags === undefined ? "" :
			data.flags.rarity === undefined ? "" :
			data.flags.rarity;
		const attune = data.flags === undefined ? "" :
			data.flags.attune === undefined ? "" :
			data.flags.attune;
		//To Do add attunement prerequisite
		const x=`
		<div class="form-group">
			<label>Attunement Required to Use</label>
			<input type="checkbox" name="flags.attune" value="1" data-dtype="Boolean"${attune === true || attune === "true" ? " checked" : ""}/>
		</div>
		<div class="form-group">
			<label>Consumable</label>
			<input type="checkbox" name="flags.consumable" value="1" data-dtype="Boolean"${consumable === true || consumable === "true" ? " checked" : ""}/>
		</div>
		<div class="form-group">
			<label>Magical</label>
			<input type="checkbox" name="flags.magical" value="1" data-dtype="Boolean"${magical === true || magical === "true" ? " checked" : ""}/>
		</div>
		<div class="form-group">
			<label>Mundane</label>
			<input type="checkbox" name="flags.mundane" value="1" data-dtype="Boolean"${mundane === true || mundane === "true" ? " checked" : ""}/>
		</div>
		<div class="form-group">
			<label>Rarity</label>
			<select name="flags.rarity" data-dtype="String">
				<option value${rarity ==="" ? " selected" : ""}></option>
				<option value${rarity ==="Common" ? " selected" : ""}>Common</option>
				<option value${rarity ==="Uncommon" ? " selected" : ""}>Uncommon</option>
				<option value${rarity ==="Rare" ? " selected" : ""}>Rare</option>
				<option value${rarity ==="Very Rare" ? " selected" : ""}>Very Rare</option>
				<option value${rarity ==="Legendary" ? " selected" : ""}>Legendary</option>
				<option value${rarity ==="Artifact" ? " selected" : ""}>Artifact</option>
				<option value${rarity ==="Artifact +" ? " selected" : ""}>Artifact +</option>
			</select>
		</div>
		<div class="form-group">
			<label>Recommended Drop Level</label>
			<input type="Number" name="flags.itemRecommendedLevel" data-dtype="Number"/>
		</div>
		<div class="form-group">
			<label>Recommended Item Genre</label>
			<i class="incTraitSelector fas fa-edit" name="flags.traits.itemRecommendedGenre" data-title="Recommended Item Genre" data-options="incarnateRecommendedItemGenre"></i>
		</div>
		${IncarnateItemClass.onTraitSelectorRender(data.flags.traits.itemRecommendedGenre,CONFIG.INCARNATE.RecommendedItemGenre)}
		<div class="form-group">
			<label>Type</label>
			<select name="flags.itemType" data-dtype="String">
				<option value${itemType ==="" ? " selected" : ""}></option>
				<option value${itemType ==="Adventuring Gear" ? " selected" : ""}>Adventuring Gear</option>
				<option value${itemType ==="Armor" ? " selected" : ""}>Armor</option>
				<option value${itemType ==="Class Ability" ? " selected" : ""}>Class Ability</option>
				<option value${itemType ==="Food, Drink, and Lodging" ? " selected" : ""}>Food, Drink, and Lodging</option>
				<option value${itemType ==="Ingredient" ? " selected" : ""}>Ingredient</option>
				<option value${itemType ==="Mounts and Other Animals" ? " selected" : ""}>Mounts and Other Animals</option>
				<option value${itemType ==="Monstrous Drop" ? " selected" : ""}>Monstrous Drop</option>
				<option value${itemType ==="Potion" ? " selected" : ""}>Potion</option>
				<option value${itemType ==="Scroll" ? " selected" : ""}>Scroll</option>
				<option value${itemType ==="Tool" ? " selected" : ""}>Tool</option>
				<option value${itemType ==="Trade Good" ? " selected" : ""}>Trade Good</option>
				<option value${itemType ==="Vehicle" ? " selected" : ""}>Vehicle</option>
				<option value${itemType ==="Weapon" ? " selected" : ""}>Weapon</option>
				<option value${itemType ==="Wondrous Item" ? " selected" : ""}>Wondrous Item</option>
			</select>
		</div>
		<div class="form-group">
			<label>Subtype</label>
			<select name="flags.itemSubtype" data-dtype="String">
				<option value${itemSubtype ==="" ? " selected" : ""}></option>
				<option value${itemSubtype ==="Light Armor" ? " selected" : ""}>Light Armor</option>
				<option value${itemSubtype ==="Medium Armor" ? " selected" : ""}>Medium Armor</option>
				<option value${itemSubtype ==="Heavy Armor" ? " selected" : ""}>Heavy Armor</option>
				<option value${itemSubtype ==="Shield" ? " selected" : ""}>Shield</option>
				<option value${itemSubtype ==="Simple Melee Weapon" ? " selected" : ""}>Simple Melee Weapon</option>
				<option value${itemSubtype ==="Martial Melee Weapon" ? " selected" : ""}>Martial Melee Weapon</option>
				<option value${itemSubtype ==="Simple Ranged Weapon" ? " selected" : ""}>Simple Ranged Weapon</option>
				<option value${itemSubtype ==="Martial Ranged Weapon" ? " selected" : ""}>Martial Ranged Weapon</option>
				<option value${itemSubtype ==="Ammunition" ? " selected" : ""}>Ammunition</option>
				<option value${itemSubtype ==="Alcohol" ? " selected" : ""}>Alcohol</option>
				<option value${itemSubtype ==="Arcane Focus" ? " selected" : ""}>Arcane Focus</option>
				<option value${itemSubtype ==="Artisan's Tool" ? " selected" : ""}>Artisan's Tool</option>
				<option value${itemSubtype ==="Book" ? " selected" : ""}>Book</option>
				<option value${itemSubtype ==="Container" ? " selected" : ""}>Container</option>
				<option value${itemSubtype ==="Cosmetic" ? " selected" : ""}>Cosmetic</option>
				<option value${itemSubtype ==="Dragon" ? " selected" : ""}>Dragon</option>
				<option value${itemSubtype ==="Druidic Focus" ? " selected" : ""}>Druidic Focus</option>
				<option value${itemSubtype ==="Equipment Kits" ? " selected" : ""}>Equipment Kits</option>
				<option value${itemSubtype ==="Gaming Set" ? " selected" : ""}>Gaming Set</option>
				<option value${itemSubtype ==="Hireling" ? " selected" : ""}>Hireling</option>
				<option value${itemSubtype ==="Holy Symbol" ? " selected" : ""}>Holy Symbol</option>
				<option value${itemSubtype ==="Improvised Weapon" ? " selected" : ""}>Improvised Weapon</option>
				<option value${itemSubtype ==="Inn stay (per day)" ? " selected" : ""}>Inn stay (per day)</option>
				<option value${itemSubtype ==="Land Vehicle" ? " selected" : ""}>Land Vehicle</option>
				<option value${itemSubtype ==="Magical Amulet" ? " selected" : ""}>Magical Amulet</option>
				<option value${itemSubtype ==="Magical Stone" ? " selected" : ""}>Magical Stone</option>
				<option value${itemSubtype ==="Meals (per day)" ? " selected" : ""}>Meals (per day)</option>
				<option value${itemSubtype ==="Mount" ? " selected" : ""}>Mount</option>
				<option value${itemSubtype ==="Musical Instrument" ? " selected" : ""}>Musical Instrument</option>
				<option value${itemSubtype ==="Pedestal of Attraction" ? " selected" : ""}>Pedestal of Attraction</option>
				<option value${itemSubtype ==="Pet" ? " selected" : ""}>Pet</option>
				<option value${itemSubtype ==="Poisons" ? " selected" : ""}>Poisons</option>
				<option value${itemSubtype ==="Ring" ? " selected" : ""}>Ring</option>
				<option value${itemSubtype ==="Spoof" ? " selected" : ""}>Spoof</option>
				<option value${itemSubtype ==="Standard" ? " selected" : ""}>Standard</option>
				<option value${itemSubtype ==="Status Juice" ? " selected" : ""}>Status Juice</option>
				<option value${itemSubtype ==="Tool" ? " selected" : ""}>Tool</option>
				<option value${itemSubtype ==="Waterborne Vehicle" ? " selected" : ""}>Waterborne Vehicle</option>
			</select>
		</div>
		`;
		return x;
	}
	static weaponType(data){
		const x = 
		`
		<div class="form-group">
			<label>Weapon Properties</label>
			<i class="incTraitSelector fas fa-edit" name="flags.traits.weaponProperties" data-title="Weapon Properties" data-options="weaponProperties"></i>
		</div>
		${IncarnateItemClass.onTraitSelectorRender(data.flags.traits.weaponProperties,CONFIG.DND5E.weaponProperties)}
		`;
		return x;
	}
	static abilitySelect(abr,target){
		const x = 
			`<select name="${target}" data-dtype="String" class="flex">
				${IncarnateItemClass.assembleSelect(CONFIG.INCARNATE.AbilityList,abr)}
			</select>`;
		return x;
	}
	static classSelect(abr,target){
		const x = 
			`<select name="${target}" data-dtype="String">
				${IncarnateItemClass.assembleSelect(CONFIG.INCARNATE.ClassList,abr)}
			</select>`;
		return x;
	}
	static assembleSelect(config,abr){
		var x = `<option value${abr === "" ? " selected" : ""}></option>`;
		Object.keys(config).forEach(key =>{
			x += `<option value="${key}"${abr === key ? " selected" : ""}>${config[key]}</option>`;
		});
		return x;
	}
	static acFormatAbilities(acFormula,target){
		var armorClassAbilities="";
		if (acFormula.abilities !== undefined && acFormula.abilities.length > 0){
			acFormula.abilities.forEach((ability,abilityIndex) =>{
				const abr = ability.ability || "";
				armorClassAbilities +=
					`<div class="acAbility flex row" data-index="${abilityIndex}">
						<div class="flex column">
							<label class="flex">Ability</label>
							${IncarnateItemClass.abilitySelect(abr,target + ".abilities." + abilityIndex + ".ability")}
						</div>
						<div class="flex column">
							<label class="flex">Max</label>
							<input class="flex" type="Number" value="${ability.max}" name="${target + '.abilities.' + abilityIndex + '.max'}" data-dtype="Number"/>
						</div>
						<a class="fas fa-trash removeAcAbility flex-auto"></a>
					</div>`;
			});
		}
		return armorClassAbilities;
	}
	static acFormatSection(data,target,cLass){
		const x = 
		`
		<div class="${cLass} column">
			<div class="flex row">
				<span class="header flex">${cLass}</span>
				<a class="fas fa-plus flex-auto add${cLass}Ability" title="Add ${cLass} Ability"></a>
			</div>
			<div class="form-group flex">
				<label>Base</label>
				<input type="Number" value="${data.base}" name="${target + '.base'}" data-dtype="Number"/>
			</div>
			${IncarnateItemClass.acFormatAbilities(data,target)}
		</div>
		`;
		return x;
	}
	static acFormat(data){
		var acFind = false;
		var armorClass = "";
		if (data.flags.ac !== undefined){
			data.flags.ac.boost = data.flags.ac.boost || {base:0,abilities:[]};
			data.flags.ac.formula = data.flags.ac.formula || {base:0,abilities:[]};
			if (data.flags.ac.boost.base !== 0 || data.flags.ac.boost.abilities.length > 0 || data.flags.ac.formula.base !== 0 || data.flags.ac.formula.abilities.length > 0){
				acFind = true;
			}
			armorClass += IncarnateItemClass.acFormatSection(data.flags.ac.boost,"flags.ac.boost","Boost");
			armorClass += IncarnateItemClass.acFormatSection(data.flags.ac.formula,"flags.ac.formula","Formula");
		}else{
			armorClass += IncarnateItemClass.acFormatSection({base:0,abilities:[]},"flags.ac.boost","Boost");
			armorClass += IncarnateItemClass.acFormatSection({base:0,abilities:[]},"flags.ac.formula","Formula");
		}
		armorClass = 
			`<div class="armorClassDetails column">
			${armorClass}
			</div>`;
		return {armorClass:armorClass,acFind:acFind};
	}
	static armorClass(data){
		const armorClass = IncarnateItemClass.acFormat(data);
		const x = 
			`
			<div class="armorClass section column${armorClass.acFind ? ' active' : ''}">
				<div class="flex header row">
					<label class="flex">Armor Class</label>
					<a class="fas fa-minus flex-auto hideAc" title="Hide AC"></a>
					<a class="fas fa-plus flex-auto hideAc" title="Show AC"></a>
				</div>
				${armorClass.armorClass}
			</div>
			`;
		return x;
	}
	static equipmentType(data){
		var x = IncarnateItemClass.armorClass(data);
		return x;
	}
	static onTraitSelector(ev,item) {
		ev.preventDefault();
		let a = ev.srcElement;
		const options = {
			name: a.getAttribute("name"),
			title: a.getAttribute("data-title"),
			choices: CONFIG.DND5E[a.getAttribute("data-options")]
		};
		var property = getProperty(item.item.data,options.name);
		if (property === undefined || property.value === undefined){
			console.log("property is undefined");
			setProperty(item.item.data,options.name,{value:"empty"})
			//item.item.update({flags:{[options.name.split(".")[1]]:{value:"empty"}}});
		}
		new TraitSelector5e(item.item, options).render(true)
	}
	static onTraitSelectorRender(data,config){
		if (data === undefined) return "";
		var x = '<ul class="traits-list">';
		data.value.forEach(node =>{
			x += `<li class="tag ${node}">${config[node]}</li>`;
		});
		x+= '</ul>';
		return x;
	};
	static hideAc(ev){
		const armorClass = IncarnateReference.getClosestClass(ev.srcElement,"armorClass");
		console.log(ev,armorClass)
		armorClass.classList.toggle("active");
	}
	static acAddBoost(ev){
		IncarnateItemClass.acAddAbility(ev,"boost");
	}
	static acAddFormula(ev){
		IncarnateItemClass.acAddAbility(ev,"formula");
	}
	static acAddAbility(ev,type){
		const incarnateFlags = IncarnateReference.getClosestClass(ev.srcElement,"item-incarnate-flags");
		var id = incarnateFlags.getAttribute("data-id");
		const actorId = incarnateFlags.getAttribute("data-actor");
		if (actorId !== null){
			const actor = game.actors.get(actorId);
			id = Number(id);
			const item = actor.data.items.find(item => item.id === id);
			const flags = JSON.parse(JSON.stringify(item.flags));
			if (flags.ac === undefined)flags.ac = {};
			if (flags.ac[type] === undefined)flags.ac[type] = {};
			if (flags.ac[type].abilities === undefined)flags.ac[type].abilities = [];
			flags.ac[type].abilities.push({ability:"",max:10});
			actor.updateOwnedItem({id:id,flags:flags});
		}else{
			const item = game.items.get(id);
			const flags = JSON.parse(JSON.stringify(item.data.flags));
			if (flags.ac === undefined)flags.ac = {};
			if (flags.ac[type] === undefined)flags.ac[type] = {};
			if (flags.ac[type].abilities === undefined)flags.ac[type].abilities = [];
			flags.ac[type].abilities.push({ability:"",max:10});
			item.update({flags:flags});
			item.sheet.render(false);
		}
	}
	static acDeleteFormula(ev){
		IncarnateItemClass.acAbilityDelete(ev,"Formula");
	}
	static acDeleteBoost(ev){
		IncarnateItemClass.acAbilityDelete(ev,"Boost");
	}
	static acAbilityDelete(ev,cLass){
		const abilityNode = IncarnateReference.getClosestClass(ev.srcElement,"acAbility");
		const index = Number(abilityNode.getAttribute("data-index"));
		const incarnateFlags = IncarnateReference.getClosestClass(ev.srcElement,"item-incarnate-flags");
		var id = incarnateFlags.getAttribute("data-id");
		const actorId = incarnateFlags.getAttribute("data-actor");
		const type = cLass.toLowerCase();
		if (actorId !== null){
			const actor = game.actors.get(actorId);
			id = Number(id);
			const item = actor.data.items.find(item => item.id === id);
			const flags = JSON.parse(JSON.stringify(item.flags));
			flags.ac[type].abilities.splice(index,1);
			actor.updateOwnedItem({id:id,flags:flags});
		}else{
			const item = game.items.get(id);
			const flags = JSON.parse(JSON.stringify(item.data.flags));
			flags.ac[type].abilities.splice(index,1);
			item.update({flags:flags});
			item.sheet.render(false);
		}
	}
	static activateListeners(itemSheet,htmlDom,data){
		htmlDom.getElementsByClassName("sheet-body")[0].style.height = "100%";
		htmlDom.getElementsByClassName("sheet-content")[0].style.height = "100%";
		if (data.type === "feat" || data.type === "equipment"){
			let hideAcNodes = htmlDom.getElementsByClassName("hideAc");
			[].forEach.call(hideAcNodes, node =>{
				node.addEventListener("click",IncarnateItemClass.hideAc);
			});
			let addAcBoost = htmlDom.getElementsByClassName("addBoostAbility");
			[].forEach.call(addAcBoost, node =>{
				node.addEventListener("click",IncarnateItemClass.acAddBoost);
			});
			let addAcFormula = htmlDom.getElementsByClassName("addFormulaAbility");
			[].forEach.call(addAcFormula, node =>{
				node.addEventListener("click",IncarnateItemClass.acAddFormula);
			});
			let deleteAcFormulaAbility = htmlDom.getElementsByClassName("Formula")[0];
			if (deleteAcFormulaAbility !== undefined){
				let deleteAcFormulaAbilityNode = deleteAcFormulaAbility.getElementsByClassName("removeAcAbility");
				[].forEach.call(deleteAcFormulaAbilityNode, node =>{
					node.addEventListener("click",IncarnateItemClass.acDeleteFormula);
				});
			}
			let deleteAcBoostAbility = htmlDom.getElementsByClassName("Boost")[0];
			if (deleteAcBoostAbility !== undefined){
				let deleteAcBoostAbilityNode = deleteAcBoostAbility.getElementsByClassName("removeAcAbility");
				[].forEach.call(deleteAcBoostAbilityNode, node =>{
					node.addEventListener("click",IncarnateItemClass.acDeleteBoost);
				});
			}
		}
	}
}
class IncarnateFiveEModSettings{
	static incarnateSetupDefaults(){
		var array = IncarnateFiveEModSettings.defaultArrayRenderLootParcel();
		game.settings.register(array.module,array.key,array);
		array = IncarnateFiveEModSettings.defaultArrayActorLogTab();
		game.settings.register(array.module,array.key,array);
		array = IncarnateFiveEModSettings.defaultArrayItemFlags();
		game.settings.register(array.module,array.key,array);
		array = IncarnateFiveEModSettings.defaultArrayAutoAc();
		game.settings.register(array.module,array.key,array);
		array = IncarnateFiveEModSettings.defaultArrayAddWeaponProp();
		game.settings.register(array.module,array.key,array);
		array = IncarnateFiveEModSettings.defaultArrayAddLanguages();
		game.settings.register(array.module,array.key,array);
		return true;
	}
	static resetDefault(){
		var array = IncarnateFiveEModSettings.defaultArrayRenderLootParcel();
		game.settings.set(array.module,array.key,array.default);
		array = IncarnateFiveEModSettings.defaultArrayActorLogTab();
		game.settings.set(array.module,array.key,array.default);
		array = IncarnateFiveEModSettings.defaultArrayItemFlags();
		game.settings.set(array.module,array.key,array.default);
		array = IncarnateFiveEModSettings.defaultArrayAutoAc();
		game.settings.set(array.module,array.key,array.default);
		array = IncarnateFiveEModSettings.defaultArrayAddWeaponProp();
		game.settings.set(array.module,array.key,array.default);
		array = IncarnateFiveEModSettings.defaultArrayAddLanguages();
		game.settings.set(array.module,array.key,array.default);
		return true;
	}
	static defaultArray(){
		return{
			config:true,
			default:true,
			module:"incarnateFiveEMod",
			scope:"client",
			type: Boolean
		}
	}
	static defaultArrayAddLanguages(){
		const array = IncarnateFiveEModSettings.defaultArray();
		array.name = "Add Languages";
		array.hint = "Adds 10 languages to the language select";
		array.key = "addLanguages";
		return array;
	}
	static defaultArrayAddWeaponProp(){
		const array = IncarnateFiveEModSettings.defaultArray();
		array.name = "Adds Weapon Properties";
		array.hint = "Adds the weapon properties: Loading, Range, and Special";
		array.key = "addWeaponProp";
		return array;
	}
	static defaultArrayRenderLootParcel(){
		const array = IncarnateFiveEModSettings.defaultArray();
		array.name = "Render Loot Parcel";
		array.hint = "When a loot parcel is generated automatically render it.";
		array.key = "renderLootParcel";
		return array;
	}
	static defaultArrayActorLogTab(){
		const array = IncarnateFiveEModSettings.defaultArray();
		array.name = "Add Log Tab";
		array.hint = "Adds a log tab to actor sheets that have recieved log data from automated distribution.";
		array.key = "addLogTab";
		return array;
	}
	static defaultArrayItemFlags(){
		const array = IncarnateFiveEModSettings.defaultArray();
		array.name = "Add Item Flags";
		array.hint = "Exposes the flag system on items to allow for creation of Incarnate System compatible compendium from within the gui.";
		array.key = "addItemFlags";
		array.default = false;
		return array;
	}
	static defaultArrayAutoAc(){
		const array = IncarnateFiveEModSettings.defaultArray();
		array.name = "Auto AC";
		array.hint = "Automatically calculates AC on level up based on equipped items with flags setup properly.";
		array.key = "autoAc";
		return array;
	}
}
class IncarnateCharacterSheetMods{
	static showItems(ev){
		const logEntry = IncarnateReference.getClosestClass(ev.srcElement,"incarnate-log");
		if (logEntry.getAttribute("data-items-hidden") === null){
			logEntry.setAttribute("data-items-hidden","");
		}else{
			logEntry.removeAttribute("data-items-hidden");
		}
	}
	static showDescription(ev){
		const logEntry = IncarnateReference.getClosestClass(ev.srcElement,"incarnate-log");
		if (logEntry.getAttribute("data-desc-hidden") === null){
			logEntry.setAttribute("data-desc-hidden","");
		}else{
			logEntry.removeAttribute("data-desc-hidden");
		}
	}
	static showGranter(ev){
		const logEntry = IncarnateReference.getClosestClass(ev.srcElement,"incarnate-log");
		if (logEntry.getAttribute("data-granter-hidden") === null){
			logEntry.setAttribute("data-granter-hidden","");
		}else{
			logEntry.removeAttribute("data-granter-hidden");
		}
	}
	static logDiv(data){
		const logDiv = document.createElement("div");
		logDiv.setAttribute("class","tab incarnateLog");
		logDiv.setAttribute("data-group","primary");
		logDiv.setAttribute("data-tab","incarnateLog");
		const logEntries = IncarnateCharacterSheetMods.logEntries(data);
		logDiv.innerHTML+=
			`<div class="log-totals flex-auto">
				<span class="log-totals-heading">Totals</span>
				<div class="log-totals-attributes row">
					<span class="log-total-gv flex-static">GV ${logEntries.totalGv}</span>
					<span class="log-total-xp flex-static">XP ${logEntries.totalXp}</span>
				</div>
			</div>`;
		logDiv.append(logEntries.entries);
		return logDiv;
	}
	static newLogItems(items){
		const newLogItems = document.createElement("div");
		newLogItems.setAttribute("class","log-items flex column");
		newLogItems.innerHTML = 
		`<div class="header flex row">
			<span class="flex-static">Name</span>
			<span class="flex-static">Value</span>
		</div>`;
		items.forEach(item =>{
			newLogItems.innerHTML +=
			`<div class="flex row">
				<span class="flex-static">${item.name}</span>
				<span class="flex-static">${item.value}</span>
			</div>`;
		});
		return newLogItems;
	}
	static newLogEntry(entry,newLogItems,editor){
		const newLogEntry = document.createElement("div");
		newLogEntry.setAttribute("class","incarnate-log column");
		newLogEntry.setAttribute("data-desc-hidden","");
		newLogEntry.setAttribute("data-items-hidden","");
		newLogEntry.setAttribute("data-granter-hidden","");
		newLogEntry.innerHTML = 
		`<span class="name flex">${entry.distName}</span>
		<span class="date flex">${new Date(entry.date)}</span>
		<span class="granter flex">Granted By: ${entry.gmName}</span>
		<div class="attributes row flex">
			<span class="flex-static">GV ${entry.gv}</span>
			<span class="flex-static">XP ${entry.xp}</span>
			<span class="flex"></span>
			<a class="fas fa-suitcase log-items-section flex-auto" title="Show Items"></a>
			<a class="fas fa-edit log-description-section flex-auto" title="Show Description"></a>
			<a class="fas fa-crown log-granter-section flex-auto" title="Show Granter"></a>
		</div>
		${newLogItems.outerHTML}
		${editor}`;
		return newLogEntry;
	}
	static logEntries(data){
		var totalXp = 0;
		var totalGv = 0;
		const logEntries = document.createElement("div");
		logEntries.setAttribute("class","logEntries flex");
		data.actor.flags.incarnateLog.forEach((entry, entryIndex) =>{
			totalXp += Number(entry.xp) > 0 ? Number(entry.xp) : 0;
			totalGv += Number(entry.gv) > 0 ? Number(entry.gv) : 0;
			const target = "flags.incarnateLog." + entryIndex + ".notes";
			const editor = IncarnateReference.mce(data,entry.notes,target);
			const newLogItems = IncarnateCharacterSheetMods.newLogItems(entry.newItems);
			const newLogEntry = IncarnateCharacterSheetMods.newLogEntry(entry,newLogItems,editor);
			logEntries.prepend(newLogEntry);
		});
		return {entries:logEntries,totalXp:totalXp,totalGv:totalGv};
	}
	static activateListeners(app,htmlDom,data){
		if (data.actor.flags["_sheetTab-primary"] !== undefined && data.actor.flags["_sheetTab-primary"] === "incarnateLog"){
			htmlDom.getElementsByClassName("incarnateLog")[0].classList.add("active");
			htmlDom.getElementsByClassName("inventory")[0].classList.remove("active");
			const appDom = IncarnateReference.getClosestClass(htmlDom,"app");
			const contentNav = appDom.getElementsByClassName("sheet-tabs tabs content")[0];
			contentNav.getElementsByClassName("active")[0].classList.remove("active");
			const aNodes = contentNav.getElementsByClassName("item");
			[].forEach.call(aNodes,a =>{
				if (a.classList.contains("active"))a.classList.remove("active");
				else if (a.getAttribute("data-tab") === "incarnateLog") a.classList.add("active");
			});
		}
		const logEntriesLoop = htmlDom.getElementsByClassName("editor-content");
		[].forEach.call(logEntriesLoop, entry =>{
			if (entry.getAttribute("data-edit") !== undefined) app._activateEditor(entry);
		});
		const logItemsSection = htmlDom.getElementsByClassName("log-items-section");
		[].forEach.call(logItemsSection,item =>{
			item.addEventListener("click",IncarnateCharacterSheetMods.showItems);
		});
		const logDescriptionSection = htmlDom.getElementsByClassName("log-description-section");
		[].forEach.call(logDescriptionSection,item =>{
			item.addEventListener("click",IncarnateCharacterSheetMods.showDescription);
		});
		const logGranterSection = htmlDom.getElementsByClassName("log-granter-section");
		[].forEach.call(logGranterSection,item =>{
			item.addEventListener("click",IncarnateCharacterSheetMods.showGranter);
		});
	}
}
/*
 * Region Settings Prep
 */
class IncarnateRegion{
	/*
	 * target = object of which settings are being updated. See IncarnateRegion.defaultRegions
	 * type = backgrounds|classes|races
	 * pack = module.name
	 * incRegions = optional over-ride that will cause target's current settings to be over-riden with before adding compendium
	 */
	static async incarnateAddFromCompendium(target, type, pack, incRegions){
		if (incRegions === undefined){
			if (target.type === "gameSettings"){
				const splitPath = target.path.split(".");
				incRegions = game.settings.get(splitPath[0],splitPath[1]);
			}else if (target.type === "folder"){
				var targetFolder = game.folders.get(target.path);
				incRegions = JSON.parse(JSON.stringify(targetFolder.data.flags.incRegions));
			}
		}
		const rawData = await IncarnateReference.incarnatePackFind(pack).getContent()
		const filteredData = rawData.filter(entry => entry.data.type === "class" && entry.data.data.subclass.value === "");
		if (type === "backgrounds"){
			filteredData.forEach(entry => {
				incRegions[type].push({
					"name":entry.data.name,
					"_id":entry.data._id,
					"pack":pack,
					"priority":1,
				});
			});
		}else{
			filteredData.forEach(entry => {
				var subEntry = [];
				const choice = entry.data.flags.choice.filter(choice => choice.name ==="Subrace" || choice.name === "Archetype");
				choice[0].choices.forEach(subChoice =>{
					subEntry.push({
						"name":subChoice.name,
						"_id":subChoice._id,
						"pack":subChoice.pack,
						"priority":1
					});
				});
				incRegions[type].push({
					"name":entry.data.name,
					"_id":entry.data._id,
					"pack":pack,
					"priority":1,
					"archetypes":subEntry
				});
			})
		}
		if (target.type === "gameSettings"){
			const splitPath = target.path.split(".");
			game.settings.set(splitPath[0],splitPath[1],incRegions);
		}else if (target.type === "folder"){
			var targetFolder = game.folders.get(target.path);
			var flags = JSON.parse(JSON.stringify(targetFolder.data.flags));
			flags.incRegions = incRegions;
			targetFolder.update({flags:flags});
		}
		return incRegions;
	}
	static incarnateSetupRegions(){
		game.settings.register("incarnate", "incRegions", {
			name: "Regions",
			hint: "Holds data needed for custimizing random generators",
			default: "",
			type: Object,
			scope: 'world',
			onChange: settings => {
				console.log(settings);
			}
		});
		if( game.settings.get("incarnate","incRegions") !=""){
			return(game.settings.get("incarnate","incRegions"));
		}else {
			IncarnateRegion.setDefaultDefault();
			return(game.settings.get("incarnate","incRegions"));
		}
	}
	static setDefaultEmpty(){
		game.settings.set("incarnate","incRegions",IncarnateRegion.clearRegions());
	}
	static setRegionEmpty(_id){
		game.folders.get(_id).update({flags:{incRegions:IncarnateRegion.clearRegions()}});
	}
	static setDefaultDefault(){
		const target = {
			type:"gameSettings",
			path:"incarnate.incRegions"
		}
		const result = IncarnateRegion.defaultRegions(target);
	}
	static setRegionDefault(_id){
		const target = {
			type:"folder",
			path:_id
		}
		const result = IncarnateRegion.defaultRegions(target);
	}
	static setRegionToWorld(_id){
		const worldSettings = game.settings.get("incarnate","incRegions");
		game.folders.get(_id).update({flags:{incRegions:worldSettings}});
	}
	static setRegionToParent(_id){
		var folder = game.folders.get(_id);
		if (folder.data.parent ===null){
			console.log("Folder: ",folder.data.name," - ",folder.data._id," has no parent");
			return false;
		}
		var parentFolder = game.folders.get(folder.data.parent);
		if (parentFolder.data.flags.incRegions === undefined){
			console.log("Folder: ",parentFolder.data.name, " - ",parentFolder.data._id," has no incRegions flag");
			return false;
		}
		folder.update({flags:{incRegions:parentFolder.data.flags.incRegions}});
	}
	/* 
	 * target = {type:"gameSettings|folder",path:"incarnate.incRegions|_id"}
	 */
	static defaultRegions(target){
		var tempRegions = {
			backgrounds:[],
			classes:[],
			incStatRoll:IncarnateStatRoll.incarnateStatRollDefaultArray(),
			races:[],
			resources:[],
			terrain:[],
			partySize:4,
			partyLevel:2,
			minXP:100,
			maxXP:400
		}
		var temp = Hooks.callAll("incRegionsSetup", tempRegions,target);
		return(tempRegions);
	}
	static clearRegions(){
		var tempRegions = {
			backgrounds:[],
			classes:[],
			races:[],
			resources:[],
			terrain:[],
			partySize:4,
			partyLevel:2,
			minXP:100,
			maxXP:400
		}
		return(tempRegions);
	}
}
TokenLayer.prototype._onDropActorData = IncarnateCanvas.prototype._onDropActorData;
ActorSheet.prototype._onDrop = IncarnateItemParcelSheet.prototype._onDrop;
ItemSheet.prototype._onDragStart = IncarnateItemSheetChanges.prototype._onDragStart;
//Add support for Felix's Spell Browser
Hooks.on('ready', () =>  {
	if (typeof SpellBrowser !== "undefined" && typeof SpellBrowser.registerCustomFilter !== "undefined"){
		console.log("running spell browser add on");
		SpellBrowser.registerCustomFilter("flags.class","Class",["Bard","Cleric","Druid","Megalutero","Paladin","Ranger","Rune Blade","Runecrafter","Sorcerer","Warlock","Wizard"]);
		IncarnateReference.incarnateDelay(1000);
		SpellBrowser.registerCustomFilter("flags.components","Components",["v","s","m"]);
		IncarnateReference.incarnateDelay(1000);
		SpellBrowser.registerCustomFilter("flags.official","Official",["true","false","mechanically modified","description added","heavily edited"]);
		IncarnateReference.incarnateDelay(1000);
		SpellBrowser.registerCustomFilter("data.duration.value","Duration",["Instantaneous","1 round","1 minute","Up to 1 minute","5 minutes","10 minutes","15 minutes","30 minutes","1 hour","Up to 1 hour","2 hours","3 hours","8 hours","Up to 8 hours","24 hours","1 day","3 days","7 days","10 days","30 days","1 year","Permanent","Special","Until dispelled","Until dispelled or triggered",]);
	}
});
