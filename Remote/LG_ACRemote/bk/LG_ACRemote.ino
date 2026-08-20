#define TIMING_OFFSET 1.575

#define KEYCODE_START 4
#define KEYCODE_END 31
#define DELAY_AFTER_INJECT 4

#define DEFAULT_TEMP  9 //26
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

#define BLYNK_TEMPLATE_ID           "TMPL6hPKa2m65"
#define BLYNK_TEMPLATE_NAME         "Quickstart Template"
#define BLYNK_AUTH_TOKEN            "PJZvkBZeGX7mEWBXVfVFQAtD26zWb68Q"

/* Comment this out to disable prints and save space */
#define BLYNK_PRINT Serial


#include <ESP8266WiFi.h>
#include <BlynkSimpleEsp8266.h>

// Your WiFi credentials.
// Set password to "" for open networks.
char ssid[] = "";
char pass[] = "";

BlynkTimer timer;

// This function is called every time the Virtual Pin 0 state changes
BLYNK_WRITE(V0)
{
  // Set incoming value from pin V0 to a variable
  int value = param.asInt();

  // Update state
  Blynk.virtualWrite(V1, value);
}

// This function is called every time the device is connected to the Blynk.Cloud
BLYNK_CONNECTED()
{
  // Change Web Link Button message to "Congratulations!"
  Blynk.setProperty(V3, "offImageUrl", "https://static-image.nyc3.cdn.digitaloceanspaces.com/general/fte/congratulations.png");
  Blynk.setProperty(V3, "onImageUrl",  "https://static-image.nyc3.cdn.digitaloceanspaces.com/general/fte/congratulations_pressed.png");
  Blynk.setProperty(V3, "url", "https://docs.blynk.io/en/getting-started/what-do-i-need-to-blynk/how-quickstart-device-was-made");
}

// This function sends Arduino's uptime every second to Virtual Pin 2.
void myTimerEvent()
{
  // You can send any value at any time.
  // Please don't send more that 10 values per second.
  Blynk.virtualWrite(V2, millis() / 1000);
}

void setup()
{
  // Debug console
  Serial.begin(115200);

  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);
  // You can also specify server:
  //Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass, "blynk.cloud", 80);
  //Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass, IPAddress(192,168,1,100), 8080);

  // Setup a function to be called every second
  timer.setInterval(1000L, myTimerEvent);
  int x = 5;
  remote(x,x);
}

void loop()
{
  Blynk.run();
  timer.run();
  // You can inject your own code or combine it with other sketches.
  // Check other examples on how to communicate with Blynk. Remember
  // to avoid delay() function!
}


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
            if(value != -1){currentTemp = value;}
            break;
        case TEMP:
            keyCode = handleTempChange(value);
            currentTemp = value;
            break;
        case FANSPEED:
            keyCode = handleFanSpeed(value);
            currentFanSpeed = value;
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

    //printIntBits(keyCode);

    inject(KEYCODE_START,keyCode);
    digitalWrite(INJECT_PIN,LOW);
    delay(DELAY_AFTER_INJECT);

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
    if(value == -1){
        return POWEROFF_CODE;
    }else{
        return handleTempChange(value) ^ POWERON_INVERT_BIT;
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

*/

