// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Stephane Tauziede (F4IZC)
// DeskPTT — porte de bruit de la réception (AudioWorklet, fil audio).
//
// Coupe le souffle de fond quand le poste ne reçoit rien : la porte s'ouvre dès
// que la crête du signal dépasse le seuil, reste ouverte un court instant
// (maintien) après qu'il est retombé, puis se referme en douceur. Un écart
// d'hystérésis évite qu'elle batte autour du seuil.
// Tourne sur le fil audio : indépendante de la fenêtre (réduite ou masquée).

const HYSTERESIS_DB = 6;   // fermeture 6 dB sous le seuil d'ouverture
const HOLD_S = 0.3;        // maintien après la dernière crête au-dessus du seuil
const ATTACK_S = 0.003;    // ouverture rapide : on ne mange pas le début des mots
const RELEASE_S = 0.08;    // fermeture douce : pas de « clic » ni de hachage
const ENV_RELEASE_S = 0.02; // décroissance du détecteur de crête

class RxGate extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -45, minValue: -90, maxValue: 0, automationRate: 'k-rate' },
      { name: 'enabled', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this.env = 0;
    // Départ fermé (pas de bouffée de souffle à l'ouverture de l'écoute) ; porte
    // désactivée, elle s'ouvre en 3 ms au premier bloc.
    this.gain = 0;
    this.open = false;
    this.holdLeft = 0;
    const k = (s) => 1 - Math.exp(-1 / (s * sampleRate));
    this.kAttack = k(ATTACK_S);
    this.kRelease = k(RELEASE_S);
    this.kEnv = k(ENV_RELEASE_S);
    this.holdSamples = Math.round(HOLD_S * sampleRate);
  }

  process(inputs, outputs, params) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0) return true;
    const enabled = params.enabled[0] >= 0.5;
    const openLin = Math.pow(10, params.threshold[0] / 20);
    const closeLin = Math.pow(10, (params.threshold[0] - HYSTERESIS_DB) / 20);
    const n = input[0].length;
    for (let i = 0; i < n; i++) {
      // Détecteur de crête (tous canaux) : montée immédiate, descente rapide.
      let peak = 0;
      for (let c = 0; c < input.length; c++) peak = Math.max(peak, Math.abs(input[c][i]));
      this.env = peak > this.env ? peak : this.env + (peak - this.env) * this.kEnv;

      if (!enabled) {
        this.open = true;
      } else if (this.env >= openLin) {
        this.open = true;
        this.holdLeft = this.holdSamples;
      } else if (this.env < closeLin) {
        if (this.holdLeft > 0) this.holdLeft--;
        else this.open = false;
      } else if (this.holdLeft > 0) {
        this.holdLeft--; // entre les deux seuils : on garde l'état, le maintien s'écoule
      }

      const target = this.open ? 1 : 0;
      this.gain += (target - this.gain) * (target > this.gain ? this.kAttack : this.kRelease);
      for (let c = 0; c < output.length; c++) {
        const src = input[Math.min(c, input.length - 1)];
        output[c][i] = src[i] * this.gain;
      }
    }
    return true;
  }
}

registerProcessor('rx-gate', RxGate);
