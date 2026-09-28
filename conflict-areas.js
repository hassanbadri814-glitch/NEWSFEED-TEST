/* ============================================================
   Pulse animatie — v5.3: grace period (3 lege checks voor stop)
   ============================================================ */
var _pulseRetryTimer = null;
var _pulseEmptyChecks = 0;
var _pulseGraceMax = 3;

function startPulse(){
  stopPulse();
  if(!CA.isMapActive) return;
  if(!CA.layer) return;

  if(!hasActiveAreas()){
    _pulseEmptyChecks++;
    if(_pulseEmptyChecks < _pulseGraceMax){
      /* Eerste paar lege checks — kort wachten en opnieuw */
      LOG("Pulse check leeg (" + _pulseEmptyChecks + "/" + _pulseGraceMax + ") — retry over 5s");
      _pulseRetryTimer = setTimeout(function(){
        _pulseRetryTimer = null;
        if(CA.isMapActive && CA.isInitialized) startPulse();
      }, 5000);
    } else {
      /* Na 3 lege checks: langere rust (30s) */
      LOG("Geen actieve oblasten — pulse over 30s opnieuw proberen");
      _pulseRetryTimer = setTimeout(function(){
        _pulseRetryTimer = null;
        _pulseEmptyChecks = 0;
        if(CA.isMapActive && CA.isInitialized) startPulse();
      }, 30000);
    }
    return;
  }

  /* Er zijn actieve oblasten — reset grace counter */
  _pulseEmptyChecks = 0;

  CA.pulseTimer = setInterval(function(){
    if(!CA.isMapActive || !CA.layer) return;
    if(!hasActiveAreas()){
      /* Tijdens draaien leeg geworden? Stop en hervat retry logica */
      stopPulse();
      startPulse();
      return;
    }
    CA.pulsePhase = (CA.pulsePhase + 1) % 2;
    var growing = CA.pulsePhase === 0;

    CA.layer.eachLayer(function(l){
      if(!l.feature || !l.feature.properties) return;
      var p = l.feature.properties;
      if(!p.attack_intensity || p.attack_intensity < PULSE_MIN_INTENSITY) return;
      if(l._caHover) return;

      var baseWeight = p.territory_gain ? 2.4 : BORDER_WEIGHT;
      var extra = (PULSE_WEIGHT_MAX - PULSE_WEIGHT_MIN) * p.attack_intensity;
      var newWeight = growing ? (baseWeight + extra) : baseWeight;
      var newOpacity = growing ? 0.95 : 0.7;

      try {
        l.setStyle({
          weight: newWeight,
          opacity: newOpacity,
          color: p.territory_gain ? COLORS.territoryGain : COLORS.pulse,
          fillOpacity: Math.min(0.65, FILL_OPACITY + (growing ? 0.08 * p.attack_intensity : 0))
        });
      } catch(e){}
    });
  }, PULSE_INTERVAL_MS);

  LOG("Pulse animatie gestart (" + PULSE_INTERVAL_MS + "ms)");
}

function stopPulse(){
  if(CA.pulseTimer){
    clearInterval(CA.pulseTimer);
    CA.pulseTimer = null;
  }
  if(_pulseRetryTimer){
    clearTimeout(_pulseRetryTimer);
    _pulseRetryTimer = null;
  }
}