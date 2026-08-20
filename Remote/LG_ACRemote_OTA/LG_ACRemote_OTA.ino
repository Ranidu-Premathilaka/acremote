#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <WiFiUdp.h>
#include <ArduinoOTA.h>

#ifndef STASSID
#define STASSID "TP-Link"
#define STAPSK "lavenderboss420"
#endif


const char* ssid = STASSID;
const char* password = STAPSK;

//End of OTA Definition

#define TIMING_OFFSET 1.575

#define KEYCODE_START 4
#define KEYCODE_END 31
#define DELAY_AFTER_INJECT 4

#define DEFAULT_TEMP  8 //26
#define DEFAULT_FAN_SPEED  0 //HIGH

#define INJECT_PIN D5

#define STARTBIT_ARRAY {2,3,0}
#define STARTBIT_LENGTH 3

#define TEMP_OFFSET 3   
#define TEMPBIT_START 12


#define HIGH_SPEED_BITS 0b00000000000000000000010000000000
#define MID_SPEED_BITS  0b00000000000000000000001000000000
#define LOW_SPEED_BITS  0b00000000000000000000000000000000
#define AUTO_SPEED_BITS 0b00000000000000000000010100000000

#define HIGH_OFFSET 15
#define MID_OFFSET  13
#define LOW_OFFSET  11
#define AUTO_OFFSET 0

#define HIGH_SPEED 0
#define MID_SPEED  1
#define LOW_SPEED  2
#define AUTO_SPEED 3

#define POWEROFF_CODE       0b10001000110000000000010100010000 //OFF

#define TEMP_CHANGE         0b10001000000010000000000000000000 
#define POWERON_INVERT_BIT  0b00000000000010000000000010000000

#define HIGHCOOL_CODE       0b10001000000100000000110111100000
#define LIGHT_CODE          0b10001000110000000000101001100000


#define SWING_CODE          0b10001000000100110001010000000000 //swing without toggle 
#define SWING_ON            0b01001
#define SWING_OFF           0b11010

#define ENRG_SAVING_CODE    0b10001000000100000000010000000000 //energy saving without toggles
#define ENRG_ON             0b00101
#define ENRG_OFF            0b10110

#define AC_CLEAN_CODE       0b10001000110000000000100000000000 //AC clean without toggles
#define CLEAN_ON            0b0110111
#define CLEAN_OFF           0b1001000

#define FANONLY_BIT     0b10001000000010100011000000000000
#define HIGH_FANONLY    0b0001
#define MID_FANONLY     0b1111
#define LOW_FANONLY     0b1101
#define AUTO_FANONLY    0b0010

#define AI_CODE         0b10001000000010110000010100000000
//AI offset matches with normal 0-x notation

#define MONSOON_CODE    0b10001000000010010011000000000000
#define HIGH_MONSOON    0b0000
#define MID_MONSOON     0b1110
#define LOW_MONSOON     0b1101
#define AUTO_MONSOON    0b0001

typedef unsigned int uint;

enum ACModes {
    FANONLY,
    ENERGY_SAVING,
    MONSOON,
    POWER,
    TEMP,
    FANSPEED,
    AIMODE,
    HIGHCOOL,
    SWING,
    ACLEAN,
    DISPLAYLIGHT
};



int currentTemp = DEFAULT_TEMP;
int currentFanSpeed = DEFAULT_FAN_SPEED;

const int steps = 4;
int timingValues[steps] = {320,1000,2000,6000};

//End of remote definition


#define BLYNK_TEMPLATE_ID "TMPL6vT5i1v96"
#define BLYNK_TEMPLATE_NAME "LGACRemote"
#define BLYNK_AUTH_TOKEN "T3PnY2FUyOVdVIxJdFp-Riu9xMCHNnQD"

/* Comment this out to disable prints and save space */
//#define BLYNK_PRINT Serial


#include <ESP8266WiFi.h>
#include <BlynkSimpleEsp8266.h>

// Your WiFi credentials.
// Set password to "" for open networks.
//char ssid[] = "TP-Link";
//char pass[] = "lavenderboss420";
int mode = 0;
//0 - normal temps
//1 - fan only
//2 - AI MODE
//3 - Monsoon

BlynkTimer timer;


//End of Blynk definition

BLYNK_WRITE(V0){remote(ENERGY_SAVING,param.asInt());}
BLYNK_WRITE(V1){remote(POWER,param.asInt());}
BLYNK_WRITE(V2){remote(SWING,param.asInt());}
BLYNK_WRITE(V3){remote(ACLEAN,param.asInt());}
BLYNK_WRITE(V7){remote(HIGHCOOL,param.asInt());}
BLYNK_WRITE(V8){remote(DISPLAYLIGHT,param.asInt());}


BLYNK_WRITE(V5){
    remote(TEMP,param.asInt() - 18);
    mode = 0;
    Blynk.virtualWrite(V4,mode);
}



BLYNK_WRITE(V6){
    int modes[] = {FANSPEED,FANONLY,AIMODE,MONSOON};
    int tempFan = param.asInt();

    if(modes[mode] != AIMODE && tempFan){
          tempFan = 4 - tempFan;
    }

    remote(modes[mode],tempFan);
}


BLYNK_WRITE(V4){
    mode = param.asInt()%4;
    Blynk.virtualWrite(V6,currentFanSpeed);
    Blynk.syncVirtual(V6);
}

//timer
BLYNK_WRITE(V9){
    long timerSec = param[0].asInt();
    
    Blynk.virtualWrite(V5,18);
    Blynk.syncVirtual(V5);
    
    timer.setTimeout((timerSec/12)*1000,writeToTemp);

    timer.setTimeout((timerSec/12)*11*1000,writeToFanOnly);

    timer.setTimeout(timerSec*1000,writeToPowerOff);
}

void writeToPowerOff(){
  Blynk.virtualWrite(V1,0);
  Blynk.syncVirtual(V1);
}

void writeToFanOnly(){
  Blynk.virtualWrite(V4,1);
  Blynk.virtualWrite(V6,0);
  Blynk.syncVirtual(V4);
  Blynk.syncVirtual(V6);
}

void writeToTemp(){
  Blynk.virtualWrite(V5,26);
  Blynk.syncVirtual(V5);
}


// This function is called every time the device is connected to the Blynk.Cloud
BLYNK_CONNECTED()
{
}



void setup() {
  Serial.begin(115200);
  Serial.println("Booting");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.waitForConnectResult() != WL_CONNECTED) {
    Serial.println("Connection Failed! Rebooting...");
    delay(5000);
    ESP.restart();
  }

  // No authentication by default
  // ArduinoOTA.setPassword("admin");

  ArduinoOTA.onStart([]() {
    String type;
    if (ArduinoOTA.getCommand() == U_FLASH) {
      type = "sketch";
    } else {  // U_FS
      type = "filesystem";
    }

    // NOTE: if updating FS this would be the place to unmount FS using FS.end()
    Serial.println("Start updating " + type);
  });
  ArduinoOTA.onEnd([]() {
    Serial.println("\nEnd");
  });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
  });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR) {
      Serial.println("Auth Failed");
    } else if (error == OTA_BEGIN_ERROR) {
      Serial.println("Begin Failed");
    } else if (error == OTA_CONNECT_ERROR) {
      Serial.println("Connect Failed");
    } else if (error == OTA_RECEIVE_ERROR) {
      Serial.println("Receive Failed");
    } else if (error == OTA_END_ERROR) {
      Serial.println("End Failed");
    }
  });
  ArduinoOTA.begin();
  Serial.println("Ready");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());


//Start of Own Code
  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, password);
  pinMode(INJECT_PIN,OUTPUT);
  digitalWrite(INJECT_PIN,LOW);
  timingErrCorrection(TIMING_OFFSET);
}

void loop() {
  ArduinoOTA.handle();
  Blynk.run();
  timer.run(); 
}


void remote(int mode, int value) {
    uint keyCode;

    switch (mode) {
        case FANONLY:
            keyCode = handleFanOnly(value);
            break;
        case ENERGY_SAVING:
            keyCode = handleToggle(ENRG_SAVING_CODE,ENRG_ON,ENRG_OFF,value);
            break;
        case MONSOON:
            keyCode = handleMonsoon(value); 
            break;
        case POWER:
            keyCode = handlePowerMode(value);
            break;
        case TEMP:
            keyCode = handleTempChange(value);
            setDefaultTemp(value);
            break;
        case FANSPEED:
            keyCode = handleFanSpeed(value);
            setDefaultFan(value);
            break;
        case AIMODE:
            keyCode = handleAI(value);
            break;
        case HIGHCOOL:
            keyCode = handleHighCool();
            break;
        case SWING:
            keyCode = handleToggle(SWING_CODE,SWING_ON,SWING_OFF,value);
            break;
        case ACLEAN:
            keyCode = handleToggle(AC_CLEAN_CODE,CLEAN_ON,CLEAN_OFF,value);
            break;
        case DISPLAYLIGHT:
            keyCode = handleLight();
            break;
    }
    //Serial.print(mode);
    //Serial.print("\t");
    //Serial.print(value);
    //Serial.print("\n");

    //printIntBits(keyCode);

    inject(KEYCODE_START,keyCode);
    digitalWrite(INJECT_PIN,LOW);
    delay(DELAY_AFTER_INJECT);

}

void setDefaultTemp(int value){
    if(value >0 && value <13){currentTemp = value;}
}
void setDefaultFan(int value){
    if(value >0 && value < 4){currentFanSpeed = value;}
}

uint handleFanOnly(int value){
    int fanOnlyCode[] = {HIGH_FANONLY,MID_FANONLY,LOW_FANONLY,AUTO_FANONLY};

    return FANONLY_BIT | getFanSpeedBits(value) | (fanOnlyCode[value]<<KEYCODE_START);
}

uint handleMonsoon(int value){
    int fanCode[] = {HIGH_MONSOON,MID_MONSOON,LOW_MONSOON,AUTO_MONSOON};

    return MONSOON_CODE | getFanSpeedBits(value) | (fanCode[value]<<KEYCODE_START);
}

//values start from 0 to 4 which is -2 to +2
uint handleAI(int value){
    uint level = (value << TEMPBIT_START) | (value << KEYCODE_START);

    return level | AI_CODE;

}

uint handleFanSpeed(int value){
  return TEMP_CHANGE | getTempBits(currentTemp,value) | getFanSpeedBits(value);
}

uint handleTempChange(int value){
    return TEMP_CHANGE | getTempBits(value,currentFanSpeed) | getFanSpeedBits(currentFanSpeed);
}

uint handleHighCool(){
    return HIGHCOOL_CODE;
}

uint handleLight(){
    return LIGHT_CODE;
}

uint handleToggle(uint StartingBits,uint onBits,uint offBits,int value){
    if (value){
        return StartingBits | (onBits<<KEYCODE_START);
    }else{
        return StartingBits | (offBits<<KEYCODE_START);
    }
}

uint handlePowerMode(int value){
    if(value){
        return handleTempChange(currentTemp) ^ POWERON_INVERT_BIT;
    }else{
        return POWEROFF_CODE;
    }
}



uint getTempBits(int tempValue,int fanValue){
    uint fourBitMask = 0b1111;
    int tempToEndOffset[] = {HIGH_OFFSET,MID_OFFSET,LOW_OFFSET,AUTO_OFFSET};

    uint tempBits = ( ( tempValue + TEMP_OFFSET ) & fourBitMask ) << TEMPBIT_START;
    uint endBits = ( ( tempValue + tempToEndOffset[fanValue] ) & fourBitMask) << KEYCODE_START;
    return tempBits | endBits;
}

uint getFanSpeedBits(int value){
    uint values[] = {HIGH_SPEED_BITS,
                     MID_SPEED_BITS,
                     LOW_SPEED_BITS,
                     AUTO_SPEED_BITS
                     };

    return values[value]; 
}



//INJECTION
short getBitValue(int bitNo,uint keyCode){
    return (short) ((keyCode >> bitNo) & 1);
}

void injectStartBits(){
    int buffer[] = STARTBIT_ARRAY;
    for (int i = 0; i < STARTBIT_LENGTH; i++){
        injectWithDelay(!(i%2),timingValues[buffer[i]]);
    } 
}

void injectWithDelay(int level,int delay){

    digitalWrite(INJECT_PIN,level);
    delayMicroseconds(delay);
}

void inject(int bitNo,uint keyCode){

    short bitValue = getBitValue(bitNo,keyCode);
    //Serial.print(bitValue);
    if(bitNo == KEYCODE_END){
        injectStartBits();
    }else{
        inject(bitNo+1,keyCode);
    }
    injectWithDelay(LOW,timingValues[bitValue]);
    injectWithDelay(HIGH,timingValues[0]);
}



//this is due to the incorrect timing info displayed when using the nodemcu
void timingErrCorrection(float offset){
  for(int i = 0; i < steps; i++){
    timingValues[i] = (int)(timingValues[i]*offset);
  }
}
