import { Map, GoogleApiWrapper, Marker, Circle } from 'google-maps-react';
import {Component} from "react";

const mapStyles = {
  width: '100%',
  height: '100%',
};

class MapComponent extends Component<any, any> {
  constructor(props: any) {
    super(props);
  }

  render = () => {
    return (
      <Map
        google={this.props.google}
        style={mapStyles}
        // @ts-ignore
        zoom={4}
        initialCenter={{ lat: this.props.lat, lng:  this.props.lng}}
      >
        <Marker
          // @ts-ignore
          position={{ lat: this.props.lat, lng: this.props.lng}} />
        <Circle radius={this.props.radius} fillColor={'#AA000011'} center={{ lat: this.props.lat, lng: this.props.lng}}/>
      </Map>
    );
  }
}


const apiKey: string = (process.env as any).GOOGLE_MAPS_API_KEY as string;

export default GoogleApiWrapper(
(props: any) => ({
    apiKey
  }
))(MapComponent)