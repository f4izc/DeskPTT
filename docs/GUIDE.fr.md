# DeskPTT — Guide d'utilisation (français)

*Votre poste FM, depuis votre bureau.* DeskPTT transforme votre PC Windows en micro et haut-parleur
de bureau pour votre émetteur-récepteur FM VHF/UHF, via une interface audio USB pour radio (carte son USB, avec un port COM ou une broche GPIO de la puce son pour le PTT).

> **En bref**
> - 🖥️ **Fonctionne sous Windows 10 et 11** (64 bits). Une **version macOS est en projet**.
> - 🎙️ **Son + PTT uniquement, pas de CAT.** DeskPTT gère l'audio dans les deux sens et passe en émission ;
>   il ne pilote pas la radio (fréquence, mode, mémoires se règlent sur le poste).
>   C'est tout ce dont a besoin la grande majorité des **TRX FM VHF/UHF mobiles et portatifs**,
>   avec ou sans prise CAT.

L'interface est en anglais par défaut : passez-la en français avec le bouton **i** (À propos) en haut
à droite, menu *Language*. Ce guide utilise les libellés français.

## Installation

**[⬇ Télécharger DeskPTT pour Windows (installeur .exe)](https://github.com/f4izc/DeskPTT/releases/latest/download/DeskPTT-Setup.exe)** puis lancez-le : aucune compilation nécessaire.
Ce lien pointe toujours vers la dernière version ; empreinte SHA-256 et versions précédentes dans les [releases](https://github.com/f4izc/DeskPTT/releases).
L'installeur n'est pas signé : Windows SmartScreen peut afficher « Windows a protégé votre ordinateur ».
Cliquez alors sur *Informations complémentaires → Exécuter quand même*.
Plateforme : Windows 10 et 11, 64 bits (x64).

## Réglage

Windows nomme l'interface du point de vue de l'ordinateur : son « Microphone » est le son qui
**sort** du poste, ses « Haut-parleurs » sont le son qui **entre** dans le poste.

1. **Réception** : *Son du poste* = `Microphone (USB PnP Sound Device)`,
   *Haut-parleur ou casque de l'ordinateur* = ce sur quoi vous voulez écouter.
2. **Émission** : *Microphone de l'ordinateur* = votre micro (casque, webcam…),
   *Vers le poste* = `Haut-parleurs (USB PnP Sound Device)`.
3. **Port COM** : le port série de l'interface (les ports à puce Silicon Labs CP210x, courante sur ces interfaces, sont repérés par ★), le même
   que dans VARA par exemple. Fermez les autres logiciels qui l'utilisent : **un port COM ne peut être
   ouvert que par une seule application à la fois**.
   Interface sans port COM (puce son CM108/CM119, SSS1621/1623, AIOC) ? Choisissez sa carte son dans la
   même liste (`CM108 GPIO — …`), puis la broche qui commande le PTT dans *Ligne de commande* :
   **GPIO 3** sur la plupart des interfaces CM108.
4. **Raccourci** : *Assigner…* puis appuyez sur la touche ou le bouton de souris voulu (Échap annule).
   Il marche que la fenêtre DeskPTT ait le focus ou non.
5. **Niveau vers le poste** (en dB) : la sortie de l'interface attaque l'entrée **micro** du poste, d'où une
   forte atténuation (−26 dB par défaut). Réglez-le à l'oreille ou avec un second récepteur.
   Le vumètre « Niveau du micro » montre ce que capte votre micro, avant atténuation.

| Réglage | Rôle |
|---|---|
| Mode | *Maintenir* (émission tant que c'est enfoncé) ou *Bascule* (un appui marche, un appui arrêt) |
| TOT | Coupure automatique de l'émission après N secondes (0 = jamais) |
| Traîne PTT | Délai entre la coupure du son et la retombée du PTT, pour ne pas tronquer la fin |
| Couper l'écoute pendant l'émission | Évite d'entendre le retour du poste dans le casque en TX |
| Filtre anti-sifflement USB | Coupe-bande 1/2/3/4 kHz + passe-bas 3,4 kHz (activé par défaut) |
| Porte de bruit | Coupe le souffle de fond de l'interface quand le poste ne reçoit rien. Seuil −60…−20 dB, visible en repère blanc sur le vumètre de réception : placez-le juste au-dessus du souffle (désactivée par défaut) |
| Amélioration de la voix | Émission : passe-haut 90 Hz, bruit de fond entre les mots baissé d'environ 10 dB, graves renforcés (+5 dB sous 250 Hz), compression légère 3:1. Les crêtes restent à peu près au même niveau, les syllabes faibles ressortent mieux (désactivée par défaut) |

Les réglages sont enregistrés dans `%APPDATA%\DeskPTT\settings.json`.

## T-CALL (tonalité 1750 Hz)

Le bouton **T-CALL**, à côté du PTT, sert à ouvrir les relais déclenchés par tonalité 1750 Hz.
Tant qu'il est maintenu, le poste passe en émission et reçoit une tonalité 1750 Hz (le micro est coupé
pendant la tonalité). Au relâchement, l'émission s'arrête. Si le PTT était déjà actif (mode bascule),
seule la tonalité s'arrête. La tonalité suit le réglage « Niveau vers le poste ».

## Pavé DTMF

Le bouton **DTMF**, à droite du T-CALL, affiche un pavé de téléphone (0–9, `*`, `#`) pour les relais et
les hotspots connectés : changer de room, déclencher une fonction. Chaque touche passe le poste en
émission si besoin et envoie sa tonalité tant qu'elle est maintenue (150 ms minimum ; la première
tonalité part 300 ms après le passage en émission, le temps que la porteuse soit détectée). L'émission
s'arrête 1,5 s après la dernière touche : une suite de chiffres part en une seule émission. Le micro est
coupé pendant les tonalités, qui suivent le réglage « Niveau vers le poste ».

## Mode VOX du poste

Si votre interface ne peut pas commander le PTT, utilisez le VOX du poste : bouton **i** (À propos) →
*Réglages* → *Commande d'émission* = **VOX du poste**, et activez le VOX sur le poste.
DeskPTT ne commande alors plus aucune ligne et n'ouvre pas le port COM. Le bouton PTT devient
**VOX / MUTE** : il ouvre ou coupe le son envoyé au poste, et c'est le VOX du poste qui passe en émission.
Le bouton et le raccourci suivent le réglage *Mode* (maintenir ou bascule), le TOT coupe le son au bout du
délai, et l'application démarre toujours en **MUTE**.

## Vues Avancée / Compacte

Le sélecteur en haut à droite bascule entre **Avancée** (tous les réglages, par défaut) et **Compacte**
(petite fenêtre : résumé RX/TX, vumètres, boutons PTT et T-CALL). La vue choisie est retenue.

## Conseils Windows

- Évitez que l'interface soit le **périphérique audio par défaut** de Windows : les sons système
  partiraient à l'antenne pendant une émission. Mettez votre casque ou vos haut-parleurs par défaut.
- *Paramètres son → Plus de paramètres → Communications* : choisissez « Ne rien faire » pour que
  Windows ne baisse pas le volume pendant l'utilisation du micro.
- Le niveau d'entrée de l'interface se règle aussi dans les propriétés du micro « USB PnP Sound Device ».

## Sifflement à 1 kHz

La puce son USB de nombreuses interfaces capte le bruit de trame USB (1 paquet par milliseconde) : un sifflement
à 1000 Hz et ses harmoniques, présent sur l'entrée même sans signal. Le *Filtre anti-sifflement USB*
le supprime. Mesuré sur le poste de développement : bruit de fond ramené de −54 à −62 dBFS.
Côté matériel, on peut aussi l'atténuer avec une ferrite sur le câble USB, un autre port USB
(à l'arrière du PC, sans hub) ou un isolateur USB contre une boucle de masse PC ↔ poste.

## Sécurité PTT

Le PTT retombe automatiquement quand : le TOT expire, l'application se ferme, l'interface plante,
le port COM ou la carte son CM108 est débranché, ou le mode ou le port PTT est changé. À l'ouverture
du port, RTS et DTR (ou la broche GPIO) sont remis à zéro, car Windows lève RTS et DTR par défaut.

> ⚠️ **PTT par GPIO (CM108)** : contrairement à un port COM, la puce son garde sa broche GPIO dans son
> dernier état si DeskPTT est arrêté brutalement (Gestionnaire des tâches, coupure du PC) pendant une
> émission. Relancer DeskPTT ou débrancher l'interface la fait retomber. Gardez le TOT du poste activé
> en dernier recours.

## Avertissement

Logiciel expérimental destiné aux radioamateurs licenciés, fourni « tel quel », sans aucune garantie.
Vous êtes seul responsable de son utilisation : votre station, vos émissions, le respect de votre licence
et de la réglementation, ainsi que tout dommage, brouillage ou dysfonctionnement qui pourrait en résulter.
En l'utilisant, vous acceptez que l'auteur n'engage aucune responsabilité.

Logiciel libre sous licence Apache 2.0 — Copyright 2026 Stephane Tauziede (F4IZC).
