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

#define BLYNK_TEMPLATE_ID "TMPL6delwiEet"
#define BLYNK_TEMPLATE_NAME "LGACRemote"
#define BLYNK_AUTH_TOKEN "dk304MeJyPqVdKMCdlimH7MFubDhVWRn"

/* Comment this out to disable prints and save space */
#define BLYNK_PRINT Serial


#include <ESP8266WiFi.h>
#include <BlynkSimpleEsp8266.h>

// Your WiFi credentials.
// Set password to "" for open networks.
char ssid[] = "TP-Link";
char pass[] = "lavenderboss420";
int mode = 0;
//0 - normal temps
//1 - fan only
//2 - AI MODE
//3 - Monsoon

BlynkTimer timer;

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
    mode = param.asInt();
    Blynk.virtualWrite(V6,currentFanSpeed);
}

// This function is called every time the device is connected to the Blynk.Cloud
BLYNK_CONNECTED()
{
}

void setup()
{
  // Debug console
  Serial.begin(115200);
  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);

  pinMode(INJECT_PIN,OUTPUT);
  
  pinMode(LED_BUILTIN,OUTPUT);
  digitalWrite(INJECT_PIN,LOW);

  timingErrCorrection(TIMING_OFFSET);
}

void loop()
{
  digitalWrite(LED_BUILTIN,LOW);
  Blynk.run();
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
    Serial.print(mode);
    Serial.print("\t");
    Serial.print(value);
    Serial.print("\n");

    printIntBits(keyCode);

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
    Serial.print(bitValue);
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


/*
void setup() {
  Serial.begin(9600);

  pinMode(INJECT_PIN,OUTPUT);
  digitalWrite(INJECT_PIN,LOW);

  timingErrCorrection(TIMING_OFFSET);
  //genTestCase();
}

void loop() {
}


void genTestCase(){
    int testCases[] = {
        4,
        2,
        4,
        14,
        13,
        4,
        5,
        1,
        2,
        2,
        1
        };

    for (int i = 0; i < 11; i++){
        for (int j = 0; j < testCases[i]; j++){
            Serial.print(i);
            Serial.print(" ");
            Serial.print(j);
            Serial.print("\n");
            
            remote(i,j);
        }    
    }
}
*/
void printIntBits(uint x){
  Serial.print(x);
  Serial.print("\t");
  for(int i = 31; i>=0; i--){
    Serial.print(getBitValue(i,x));
    if(i%4 == 0){
      Serial.print(" ");
    }
  }
  Serial.println(" ");
}



