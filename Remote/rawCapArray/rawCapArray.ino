#define scanStep 12

int intervalTime = 0;
int buttonPressed = 0;
int count;
unsigned long time = 0;
int buffer[300];

void setup() {
  Serial.begin(19200);
  attachInterrupt(digitalPinToInterrupt(2), bitChange, CHANGE);
  pinMode(A0,INPUT);
  //pinMode(11,INPUT);
  pinMode(10,INPUT);
}

//dont press while printaing

void loop(){
  //if(digitalRead(11)){
  //Serial.println(analogRead(A0));
  //}
  delayMicroseconds(scanStep);
  intervalTime++;

  if(count==1){
    buttonPressed = 1;
  }

  if(buttonPressed && digitalRead(10)){
    Serial.println(count);
    for(int i = 1; i < count; i++){
      Serial.print(buffer[i]*scanStep);
      Serial.print(",");
      /*
      if(i%2){
        Serial.print("L\t");
      }else{
        Serial.print("H\t");
      }
      */
    }
    Serial.print(" next \n");
    count = 0;
    buttonPressed = 0;
  }

}

//this can be an issue after the 70min mark but the probability is extermely low since the signal is fast

void bitChange(){
  buffer[count++] = intervalTime;
  intervalTime = 0;

}
