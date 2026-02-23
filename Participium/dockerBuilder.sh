docker build --no-cache -t shuba19/participium_g16:server ./server/
docker build --no-cache -t shuba19/participium_g16:client ./client/
docker build --no-cache -t shuba19/participium_g16:telegram ./telegram/
docker push shuba19/participium_g16:server
docker push shuba19/participium_g16:client
docker push shuba19/participium_g16:telegram