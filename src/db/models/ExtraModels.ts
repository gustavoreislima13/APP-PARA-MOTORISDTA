import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../connection';
import { User } from './User';

export class CityEvent extends Model {
  declare id: number;
  declare title: string;
  declare date: string;
  declare location: string;
  declare description: string;
  declare is_premium: boolean;
}

CityEvent.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_premium: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'city_events',
    timestamps: true,
  }
);

export class DemandRegion extends Model {
  declare id: number;
  declare name: string;
  declare address: string;
  declare demand_level: string; // 'high' | 'medium' | 'low'
  declare best_hours: string;
  declare is_premium: boolean;
}

DemandRegion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    demand_level: {
      type: DataTypes.STRING,
      defaultValue: 'high',
    },
    best_hours: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_premium: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'demand_regions',
    timestamps: true,
  }
);

export class CommunityPost extends Model {
  declare id: number;
  declare driver_id: number;
  declare author_name: string;
  declare content: string;
  declare likes: number;
  declare comments_count: number;
}

CommunityPost.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    author_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    likes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    comments_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'community_posts',
    timestamps: true,
  }
);

export class Journey extends Model {
  declare id: number;
  declare driver_id: number;
  declare date: string;
  declare start_time: string;
  declare end_time: string;
  declare earnings: number;
  declare km_driven: number;
  declare hours_worked: number;
  declare status: string; // 'active' | 'completed'
}

Journey.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    earnings: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    km_driven: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    hours_worked: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active',
    },
  },
  {
    sequelize,
    tableName: 'journeys',
    timestamps: true,
  }
);

export class SmartPlanner extends Model {
  declare id: number;
  declare driver_id: number;
  declare day_of_week: string;
  declare shift: string; // 'morning' | 'afternoon' | 'night'
  declare recommended_action: string;
  declare expected_revenue: number;
}

SmartPlanner.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    day_of_week: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    shift: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    recommended_action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expected_revenue: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'smart_planners',
    timestamps: true,
  }
);

export class FuturePrediction extends Model {
  declare id: number;
  declare driver_id: number;
  declare target_date: string;
  declare predicted_earnings: number;
  declare confidence_score: number;
  declare reasoning: string;
}

FuturePrediction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    target_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    predicted_earnings: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    confidence_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    reasoning: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'future_predictions',
    timestamps: true,
  }
);

export class TaximeterRate extends Model {
  declare id: number;
  declare driver_id: number;
  declare name: string;
  declare base_price: number;
  declare price_per_km: number;
  declare price_per_minute: number;
}

TaximeterRate.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    base_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 5.00,
    },
    price_per_km: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 2.00,
    },
    price_per_minute: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.50,
    },
  },
  {
    sequelize,
    tableName: 'taximeter_rates',
    timestamps: true,
  }
);

export class SimulatorRecord extends Model {
  declare id: number;
  declare driver_id: number;
  declare origin: string;
  declare destination: string;
  declare distance_km: number;
  declare duration_mins: number;
  declare calculated_price: number;
  declare net_profit: number;
}

SimulatorRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    origin: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    destination: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    distance_km: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    duration_mins: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    calculated_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    net_profit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'simulator_records',
    timestamps: true,
  }
);
